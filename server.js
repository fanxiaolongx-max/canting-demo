// server.js 头部区域
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const QRCode = require('qrcode');
const db = require('./db');

const app = express();

// --- 修改 1: 适配 Fly.io 的端口 (fly.toml 中是 3000) ---
const PORT = process.env.PORT || 3010; 

app.use(express.json());

// --- 修改 2: 静态文件处理 (关键) ---
// 检测生产环境
const IS_PROD = fs.existsSync('/data');

// 定义图片存储目录
const STATIC_DIR = IS_PROD ? '/data/static' : path.join(__dirname, 'static');

// 确保图片目录存在
if (!fs.existsSync(STATIC_DIR)) {
    fs.mkdirSync(STATIC_DIR, { recursive: true });
}

// 定义备份目录
const BACKUP_DIR = IS_PROD ? '/data/backups' : path.join(__dirname, 'backups');

// 确保备份目录存在
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// 托管静态文件：
// 1. 托管代码里的静态文件 (如 css, js, 默认 logo)，并对 HTML 禁用缓存
app.use(express.static(__dirname, {
    setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
    }
}));
// 2. 托管上传的图片 (映射 /static 路径到持久化目录)
app.use('/static', express.static(STATIC_DIR));

// 初始化数据库
db.initDatabase();
// 尝试从JSON迁移数据（首次运行）
db.migrateFromJSON();

// --- 配置图片上传 ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // --- 修改 3: 使用上面定义的持久化 STATIC_DIR ---
        cb(null, STATIC_DIR) 
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        cb(null, 'img-' + Date.now() + ext)
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('只允许上传图片文件 (JPEG, PNG, GIF, WEBP)'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

// --- 认证中间件 ---
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'demo2024';

function checkAdminAuth(req, res, next) {
    const token = req.headers['x-admin-token'] || req.query.token;
    if (token === ADMIN_TOKEN) {
        next();
    } else {
        res.status(403).json({ error: '无访问权限' });
    }
}

// ===== API 接口 =====

// 1. 获取前台展示数据
app.get('/api/data', (req, res) => {
    try {
        const config = db.getConfig();
        const dishes = db.getAllDishes();
        const chefs = db.getAllChefs();
        
        // 转换格式以兼容前端
        const responseData = {
            config: {
                title: config.title,
                date: config.date_location,
                logo_url: 'static/logo.png?v=20260702',  // 固定使用logo
                qr_url: 'static/logo.png?v=20260702',    // 不再使用
                refresh_interval: config.refresh_interval
            },
            dishes: dishes.map(d => ({
                id: d.id,
                name: d.name,
                chef: d.chef,
                up: d.up_votes,
                down: d.down_votes
            })),
            chefs: chefs.map(c => ({
                id: c.id,
                name: c.name,
                role: c.role,
                photo: c.photo,
                desc: c.description,
                daily_rank: c.daily_rank,
                monthly_rank: c.monthly_rank,
                monthly_votes: c.monthly_votes
            }))
        };
        
        res.json(responseData);
    } catch (err) {
        console.error('获取数据失败:', err);
        res.status(500).json({ error: '获取数据失败' });
    }
});

// 2. 菜品投票接口
app.post('/api/vote', (req, res) => {
    const { dishId, type } = req.body;
    
    if (!dishId || !['up', 'down'].includes(type)) {
        return res.status(400).json({ error: '参数错误' });
    }
    
    try {
        db.voteDish(dishId, type);
        const dish = db.getDish(dishId);
        
        console.log(`👍 菜品投票: ${dish.name} - ${type === 'up' ? '赞' : '踩'}`);
        
        // 返回更新后的所有数据
        const config = db.getConfig();
        const dishes = db.getAllDishes();
        const chefs = db.getAllChefs();
        
        const responseData = {
            success: true,
            newData: {
                config: {
                    title: config.title,
                    date: config.date_location
                },
                dishes: dishes.map(d => ({
                    id: d.id,
                    name: d.name,
                    chef: d.chef,
                    up: d.up_votes,
                    down: d.down_votes
                })),
                chefs: chefs.map(c => ({
                    id: c.id,
                    name: c.name,
                    role: c.role,
                    photo: c.photo,
                    desc: c.description,
                    daily_rank: c.daily_rank,
                    monthly_rank: c.monthly_rank,
                    monthly_votes: c.monthly_votes
                }))
            }
        };
        
        res.json(responseData);
    } catch (err) {
        console.error('投票失败:', err);
        res.status(500).json({ error: '投票失败' });
    }
});

// 2.1 取消菜品投票
app.post('/api/vote-cancel', (req, res) => {
    const { dishId, type } = req.body;
    
    if (!dishId || !['up', 'down'].includes(type)) {
        return res.status(400).json({ error: '参数错误' });
    }
    
    try {
        const dish = db.getDish(dishId);
        if (!dish) {
            return res.status(404).json({ error: '菜品不存在' });
        }
        
        // 减少票数（不能小于0）
        if (type === 'up' && dish.up_votes > 0) {
            db.updateDish(dishId, {
                ...dish,
                up_votes: dish.up_votes - 1
            });
        } else if (type === 'down' && dish.down_votes > 0) {
            db.updateDish(dishId, {
                ...dish,
                down_votes: dish.down_votes - 1
            });
        }
        
        console.log(`↩️ 取消投票: ${dish.name} - ${type === 'up' ? '赞' : '踩'}`);
        
        // 返回更新后的所有数据
        const config = db.getConfig();
        const dishes = db.getAllDishes();
        const chefs = db.getAllChefs();
        
        const responseData = {
            success: true,
            newData: {
                config: {
                    title: config.title,
                    date: config.date_location
                },
                dishes: dishes.map(d => ({
                    id: d.id,
                    name: d.name,
                    chef: d.chef,
                    up: d.up_votes,
                    down: d.down_votes
                })),
                chefs: chefs.map(c => ({
                    id: c.id,
                    name: c.name,
                    role: c.role,
                    photo: c.photo,
                    desc: c.description,
                    daily_rank: c.daily_rank,
                    monthly_rank: c.monthly_rank,
                    monthly_votes: c.monthly_votes
                }))
            }
        };
        
        res.json(responseData);
    } catch (err) {
        console.error('取消投票失败:', err);
        res.status(500).json({ error: '取消投票失败' });
    }
});

// 2.5 厨师投票接口（新增）
app.post('/api/vote-chef', (req, res) => {
    const { chefId } = req.body;
    
    if (!chefId) {
        return res.status(400).json({ error: '参数错误' });
    }
    
    try {
        const chef = db.getChef(chefId);
        if (!chef) {
            return res.status(404).json({ error: '厨师不存在' });
        }
        
        // 增加月票数
        db.updateChef(chefId, {
            ...chef,
            monthly_votes: chef.monthly_votes + 1
        });
        
        console.log(`👍 厨师投票: ${chef.name} +1票`);
        
        // 返回更新后的所有数据
        const config = db.getConfig();
        const dishes = db.getAllDishes();
        const chefs = db.getAllChefs();
        
        const responseData = {
            success: true,
            newData: {
                config: {
                    title: config.title,
                    date: config.date_location
                },
                dishes: dishes.map(d => ({
                    id: d.id,
                    name: d.name,
                    chef: d.chef,
                    up: d.up_votes,
                    down: d.down_votes
                })),
                chefs: chefs.map(c => ({
                    id: c.id,
                    name: c.name,
                    role: c.role,
                    photo: c.photo,
                    desc: c.description,
                    daily_rank: c.daily_rank,
                    monthly_rank: c.monthly_rank,
                    monthly_votes: c.monthly_votes
                }))
            }
        };
        
        res.json(responseData);
    } catch (err) {
        console.error('厨师投票失败:', err);
        res.status(500).json({ error: '投票失败' });
    }
});

// 2.6 取消厨师投票
app.post('/api/vote-chef-cancel', (req, res) => {
    const { chefId } = req.body;
    
    if (!chefId) {
        return res.status(400).json({ error: '参数错误' });
    }
    
    try {
        const chef = db.getChef(chefId);
        if (!chef) {
            return res.status(404).json({ error: '厨师不存在' });
        }
        
        // 减少月票数（不能小于0）
        if (chef.monthly_votes > 0) {
            db.updateChef(chefId, {
                ...chef,
                monthly_votes: chef.monthly_votes - 1
            });
        }
        
        console.log(`↩️ 取消厨师投票: ${chef.name} -1票`);
        
        // 返回更新后的所有数据
        const config = db.getConfig();
        const dishes = db.getAllDishes();
        const chefs = db.getAllChefs();
        
        const responseData = {
            success: true,
            newData: {
                config: {
                    title: config.title,
                    date: config.date_location
                },
                dishes: dishes.map(d => ({
                    id: d.id,
                    name: d.name,
                    chef: d.chef,
                    up: d.up_votes,
                    down: d.down_votes
                })),
                chefs: chefs.map(c => ({
                    id: c.id,
                    name: c.name,
                    role: c.role,
                    photo: c.photo,
                    desc: c.description,
                    daily_rank: c.daily_rank,
                    monthly_rank: c.monthly_rank,
                    monthly_votes: c.monthly_votes
                }))
            }
        };
        
        res.json(responseData);
    } catch (err) {
        console.error('取消厨师投票失败:', err);
        res.status(500).json({ error: '取消投票失败' });
    }
});

// 3. 上传图片（需要认证）
app.post('/api/upload', checkAdminAuth, upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: '无文件' });
    }
    console.log('✅ 图片已上传:', req.file.filename);
    res.json({ 
        url: 'static/' + req.file.filename,
        filename: req.file.filename,
        size: req.file.size
    });
});

// 处理上传错误
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: '文件大小超过5MB限制' });
        }
        return res.status(400).json({ error: '文件上传错误: ' + err.message });
    } else if (err) {
        return res.status(400).json({ error: err.message });
    }
    next();
});

// ===== 管理后台 API =====

// 4. 获取配置
app.get('/api/admin/config', checkAdminAuth, (req, res) => {
    try {
        const config = db.getConfig();
        res.json({ success: true, config });
    } catch (err) {
        res.status(500).json({ error: '获取配置失败' });
    }
});

// 5. 更新配置
app.post('/api/admin/config', checkAdminAuth, (req, res) => {
    try {
        db.updateConfig(req.body);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: '更新配置失败' });
    }
});

// 5.1 公开 API：更新刷新频率 (看板前端调用)
app.post('/api/config/interval', (req, res) => {
    try {
        const interval = parseInt(req.body.interval, 10);
        if (isNaN(interval) || interval < 1) {
            return res.status(400).json({ error: '无效的时间间隔' });
        }
        db.updateRefreshInterval(interval);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: '更新刷新间隔失败' });
    }
});

// 6. 获取所有菜品
app.get('/api/admin/dishes', checkAdminAuth, (req, res) => {
    try {
        const dishes = db.getAllDishes();
        res.json({ success: true, dishes });
    } catch (err) {
        res.status(500).json({ error: '获取菜品失败' });
    }
});

// 7. 创建菜品
app.post('/api/admin/dishes', checkAdminAuth, (req, res) => {
    try {
        const result = db.createDish(req.body);
        res.json({ success: true, id: result.lastInsertRowid });
    } catch (err) {
        res.status(500).json({ error: '创建菜品失败' });
    }
});

// 8. 更新菜品
app.put('/api/admin/dishes/:id', checkAdminAuth, (req, res) => {
    try {
        db.updateDish(req.params.id, req.body);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: '更新菜品失败' });
    }
});

// 9. 删除菜品
app.delete('/api/admin/dishes/:id', checkAdminAuth, (req, res) => {
    try {
        db.deleteDish(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: '删除菜品失败' });
    }
});

// 10. 获取所有厨师
app.get('/api/admin/chefs', checkAdminAuth, (req, res) => {
    try {
        const chefs = db.getAllChefs();
        res.json({ success: true, chefs });
    } catch (err) {
        res.status(500).json({ error: '获取厨师失败' });
    }
});

// 11. 创建厨师
app.post('/api/admin/chefs', checkAdminAuth, (req, res) => {
    try {
        const result = db.createChef(req.body);
        res.json({ success: true, id: result.lastInsertRowid });
    } catch (err) {
        res.status(500).json({ error: '创建厨师失败' });
    }
});

// 12. 更新厨师
app.put('/api/admin/chefs/:id', checkAdminAuth, (req, res) => {
    try {
        db.updateChef(req.params.id, req.body);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: '更新厨师失败' });
    }
});

// 13. 删除厨师
app.delete('/api/admin/chefs/:id', checkAdminAuth, (req, res) => {
    try {
        db.deleteChef(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: '删除厨师失败' });
    }
});

// ===== 论坛 API =====

// 14. 获取帖子（支持分页）
app.get('/api/forum/posts', (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;
        
        const posts = db.getAllPosts(page, pageSize);
        const totalCount = db.getPostsCount();
        const totalPages = Math.ceil(totalCount / pageSize);
        
        // 获取每个帖子的评论
        const postsWithComments = posts.map(p => {
            const comments = db.getCommentsByPostId(p.id);
            const commentsWithDeviceId = comments.map(c => ({
                id: c.id,
                content: c.content,
                device_id: c.device_id || null,  // 返回设备ID用于前端判断，旧评论可能为null
                timestamp: c.created_at * 1000
            }));
            
            // 调试：输出评论的device_id信息
            if (commentsWithDeviceId.length > 0) {
                console.log(`📝 帖子 ${p.id} 的评论device_id:`, commentsWithDeviceId.map(c => ({
                    id: c.id,
                    device_id: c.device_id || '(null)'
                })));
            }
            
            return {
                id: p.id,
                content: p.content,
                likes: p.likes,
                device_id: p.device_id || null,  // 返回设备ID用于前端判断，旧帖子可能为null
                timestamp: p.created_at * 1000,
                comments: commentsWithDeviceId
            };
        });
        
        res.json({ 
            posts: postsWithComments,
            pagination: {
                page,
                pageSize,
                totalCount,
                totalPages
            }
        });
    } catch (err) {
        console.error('获取帖子失败:', err);
        res.status(500).json({ error: '获取帖子失败' });
    }
});

// 15. 发布帖子
app.post('/api/forum/post', (req, res) => {
    const { content, deviceId } = req.body;
    
    console.log('📥 收到帖子请求:', {
        content: content ? content.substring(0, 30) + (content.length > 30 ? '...' : '') : '(null)',
        deviceId: deviceId || '(null)',
        deviceIdType: typeof deviceId
    });
    
    if (!content || content.trim().length < 5) {
        return res.status(400).json({ error: '内容太短，至少5个字' });
    }
    
    if (content.length > 500) {
        return res.status(400).json({ error: '内容过长，最多500字' });
    }
    
    if (!deviceId) {
        console.error('❌ 设备ID缺失！', { content: content.substring(0, 30), deviceId });
        return res.status(400).json({ error: '设备ID缺失' });
    }
    
    try {
        const result = db.createPost(content.trim(), deviceId);
        console.log('💬 新帖子保存成功:', {
            content: content.substring(0, 30) + (content.length > 30 ? '...' : ''),
            deviceId: deviceId,
            postId: result.lastInsertRowid
        });
        
        // 验证保存是否成功
        const savedPost = db.getPost(result.lastInsertRowid);
        console.log('🔍 验证保存的帖子:', {
            id: savedPost.id,
            device_id: savedPost.device_id || '(null)',
            device_idType: typeof savedPost.device_id
        });
        
        res.json({ success: true, id: result.lastInsertRowid });
    } catch (err) {
        console.error('❌ 发布帖子失败:', err);
        res.status(500).json({ error: '发布失败' });
    }
});

// 16. 点赞/取消点赞
app.post('/api/forum/like', (req, res) => {
    const { postId, action } = req.body;
    
    if (!postId || !['like', 'unlike'].includes(action)) {
        return res.status(400).json({ error: '参数错误' });
    }
    
    try {
        const result = db.likePost(postId, action);
        res.json({ success: true, likes: result.likes });
    } catch (err) {
        res.status(500).json({ error: '操作失败' });
    }
});

// 17. 发布评论
app.post('/api/forum/comment', (req, res) => {
    const { postId, content, deviceId } = req.body;
    
    console.log('📥 收到评论请求:', {
        postId,
        content: content ? content.substring(0, 20) + (content.length > 20 ? '...' : '') : '(null)',
        deviceId: deviceId || '(null)',
        deviceIdType: typeof deviceId,
        bodyKeys: Object.keys(req.body)
    });
    
    if (!postId || !content || content.trim().length < 2) {
        return res.status(400).json({ error: '内容太短，至少2个字' });
    }
    
    if (content.length > 200) {
        return res.status(400).json({ error: '内容过长，最多200字' });
    }
    
    if (!deviceId) {
        console.error('❌ 设备ID缺失！', { postId, content: content.substring(0, 20), deviceId });
        return res.status(400).json({ error: '设备ID缺失' });
    }
    
    try {
        const result = db.createComment(postId, content.trim(), deviceId);
        console.log('💬 新评论保存成功:', {
            postId,
            content: content.substring(0, 20) + (content.length > 20 ? '...' : ''),
            deviceId: deviceId,
            commentId: result.lastInsertRowid,
            changes: result.changes
        });
        
        // 验证保存是否成功
        const savedComment = db.getComment(result.lastInsertRowid);
        console.log('🔍 验证保存的评论:', {
            id: savedComment.id,
            device_id: savedComment.device_id || '(null)',
            device_idType: typeof savedComment.device_id
        });
        
        res.json({ success: true, id: result.lastInsertRowid });
    } catch (err) {
        console.error('❌ 发布评论失败:', err);
        res.status(500).json({ error: '发布失败' });
    }
});

// 18. 删除评论
app.delete('/api/forum/comment/:id', (req, res) => {
    const { id } = req.params;
    const { deviceId } = req.body;
    
    if (!deviceId) {
        return res.status(400).json({ error: '设备ID缺失' });
    }
    
    try {
        db.deleteComment(parseInt(id), deviceId);
        console.log('🗑️ 删除评论:', id);
        res.json({ success: true });
    } catch (err) {
        if (err.message === '评论不存在') {
            return res.status(404).json({ error: '评论不存在' });
        } else if (err.message === '无权删除此评论') {
            return res.status(403).json({ error: '无权删除此评论' });
        } else if (err.message.includes('30分钟')) {
            return res.status(400).json({ error: err.message });
        }
        console.error('删除评论失败:', err);
        res.status(500).json({ error: '删除失败' });
    }
});

// 19. 删除帖子
app.delete('/api/forum/post/:id', (req, res) => {
    const { id } = req.params;
    const { deviceId } = req.body;
    
    if (!deviceId) {
        return res.status(400).json({ error: '设备ID缺失' });
    }
    
    try {
        db.deletePost(parseInt(id), deviceId);
        console.log('🗑️ 删除帖子:', id, '（级联删除相关评论）');
        res.json({ success: true });
    } catch (err) {
        if (err.message === '帖子不存在') {
            return res.status(404).json({ error: '帖子不存在' });
        } else if (err.message === '无权删除此帖子') {
            return res.status(403).json({ error: '无权删除此帖子' });
        } else if (err.message.includes('30分钟')) {
            return res.status(400).json({ error: err.message });
        }
        console.error('删除帖子失败:', err);
        res.status(500).json({ error: '删除失败' });
    }
});

// ===== 二维码生成 =====

// 17. 生成二维码
app.get('/api/qrcode/:type', async (req, res) => {
    const { type } = req.params;
    
    // 获取实际访问地址
    const host = req.get('host') || `localhost:${PORT}`;
    let url = '';
    
    if (type === 'vote') {
        url = `http://${host}/mobile-vote.html`;
    } else if (type === 'forum') {
        url = `http://${host}/mobile-forum.html`;
    } else {
        return res.status(400).json({ error: '无效的类型' });
    }
    
    try {
        const qrImage = await QRCode.toDataURL(url, {
            width: 600,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#ffffff'
            },
            errorCorrectionLevel: 'H'
        });
        
        res.json({ success: true, qrcode: qrImage, url });
    } catch (err) {
        console.error('生成二维码失败:', err);
        res.status(500).json({ error: '生成二维码失败' });
    }
});

// 启动服务器
app.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log(`🍽️  餐厅看板系统已启动 v2.0`);
    console.log('='.repeat(50));
    console.log(`📺 前台地址: http://localhost:${PORT}`);
    console.log(`⚙️  后台地址: http://localhost:${PORT}/admin.html`);
    console.log(`📱 手机投票: http://localhost:${PORT}/mobile-vote.html`);
    console.log(`💬 心声墙: http://localhost:${PORT}/mobile-forum.html`);
    console.log(`🔑 管理密钥: ${ADMIN_TOKEN}`);
    console.log(`💾 数据库: restaurant.db (SQLite)`);
    console.log('='.repeat(50));
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n正在关闭服务器...');
    db.close();
    process.exit(0);
});
