// 数据库模块
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// const DB_PATH = path.join(__dirname, 'restaurant.db');
// --- 修改开始 ---
// 检测是否存在 /data 目录 (Fly.io 挂载点)
const IS_PROD = fs.existsSync('/data');

// 如果在生产环境，数据库存放在 /data，否则存放在当前目录
const DB_PATH = IS_PROD 
    ? path.join('/data', 'restaurant.db') 
    : path.join(__dirname, 'restaurant.db');

console.log(`📂 数据库路径: ${DB_PATH}`);
// --- 修改结束 ---

// 创建数据库连接
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// 初始化数据库表结构
function initDatabase() {
    // 配置表
    db.exec(`
        CREATE TABLE IF NOT EXISTS config (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            title TEXT NOT NULL DEFAULT '餐厅看板系统',
            date_location TEXT,
            auto_date INTEGER DEFAULT 1,
            updated_at INTEGER DEFAULT (strftime('%s', 'now'))
        );
    `);

    // 菜品表
    db.exec(`
        CREATE TABLE IF NOT EXISTS dishes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            chef TEXT NOT NULL,
            up_votes INTEGER DEFAULT 0,
            down_votes INTEGER DEFAULT 0,
            created_at INTEGER DEFAULT (strftime('%s', 'now')),
            updated_at INTEGER DEFAULT (strftime('%s', 'now'))
        );
    `);

    // 厨师表
    db.exec(`
        CREATE TABLE IF NOT EXISTS chefs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            role TEXT NOT NULL,
            photo TEXT DEFAULT 'static/logo.png',
            description TEXT,
            daily_rank INTEGER DEFAULT 99,
            monthly_rank INTEGER DEFAULT 99,
            monthly_votes INTEGER DEFAULT 0,
            created_at INTEGER DEFAULT (strftime('%s', 'now')),
            updated_at INTEGER DEFAULT (strftime('%s', 'now'))
        );
    `);

    // 论坛帖子表
    db.exec(`
        CREATE TABLE IF NOT EXISTS forum_posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT NOT NULL,
            likes INTEGER DEFAULT 0,
            created_at INTEGER DEFAULT (strftime('%s', 'now'))
        );
    `);

    // 论坛评论表
    db.exec(`
        CREATE TABLE IF NOT EXISTS forum_comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            device_id TEXT,
            created_at INTEGER DEFAULT (strftime('%s', 'now')),
            FOREIGN KEY (post_id) REFERENCES forum_posts(id) ON DELETE CASCADE
        );
    `);

    // 迁移：检查并添加 device_id 字段（如果不存在）
    try {
        // 检查评论表的 device_id 字段
        const commentsTableInfo = db.prepare("PRAGMA table_info(forum_comments)").all();
        const commentsHasDeviceId = commentsTableInfo.some(col => col.name === 'device_id');
        
        if (!commentsHasDeviceId) {
            console.log('🔄 检测到旧表结构，添加 forum_comments.device_id 字段...');
            db.prepare('ALTER TABLE forum_comments ADD COLUMN device_id TEXT').run();
            console.log('✅ forum_comments.device_id 字段已添加');
        }
        
        // 检查帖子表的 device_id 字段
        const postsTableInfo = db.prepare("PRAGMA table_info(forum_posts)").all();
        const postsHasDeviceId = postsTableInfo.some(col => col.name === 'device_id');
        
        if (!postsHasDeviceId) {
            console.log('🔄 检测到旧表结构，添加 forum_posts.device_id 字段...');
            db.prepare('ALTER TABLE forum_posts ADD COLUMN device_id TEXT').run();
            console.log('✅ forum_posts.device_id 字段已添加');
        }
    } catch (err) {
        console.error('⚠️ 检查 device_id 字段时出错:', err);
    }

    // 如果config表为空，插入默认配置
    const configExists = db.prepare('SELECT COUNT(*) as count FROM config').get();
    if (configExists.count === 0) {
        db.prepare(`
            INSERT INTO config (id, title, auto_date) 
            VALUES (1, '埃及尼罗河餐厅全接触', 1)
        `).run();
    }

    console.log('✅ 数据库初始化完成');
}

// ===== 配置相关 =====

function getConfig() {
    const config = db.prepare('SELECT * FROM config WHERE id = 1').get();
    
    // 如果启用自动日期，生成当前日期
    if (config && config.auto_date === 1) {
        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const timeStr = now.getHours() < 14 ? '午餐' : '晚餐';
        config.date_location = config.date_location || `${dateStr} ${timeStr}`;
    }
    
    return config;
}

function updateConfig(data) {
    const stmt = db.prepare(`
        UPDATE config 
        SET title = ?, date_location = ?, auto_date = ?, updated_at = strftime('%s', 'now')
        WHERE id = 1
    `);
    return stmt.run(data.title, data.date_location, data.auto_date ? 1 : 0);
}

// ===== 菜品相关 =====

function getAllDishes() {
    return db.prepare('SELECT * FROM dishes ORDER BY up_votes DESC').all();
}

function getDish(id) {
    return db.prepare('SELECT * FROM dishes WHERE id = ?').get(id);
}

function createDish(data) {
    const stmt = db.prepare(`
        INSERT INTO dishes (name, chef, up_votes, down_votes)
        VALUES (?, ?, ?, ?)
    `);
    return stmt.run(data.name, data.chef, data.up_votes || 0, data.down_votes || 0);
}

function updateDish(id, data) {
    const stmt = db.prepare(`
        UPDATE dishes 
        SET name = ?, chef = ?, up_votes = ?, down_votes = ?, updated_at = strftime('%s', 'now')
        WHERE id = ?
    `);
    return stmt.run(data.name, data.chef, data.up_votes, data.down_votes, id);
}

function deleteDish(id) {
    return db.prepare('DELETE FROM dishes WHERE id = ?').run(id);
}

function voteDish(id, type) {
    const column = type === 'up' ? 'up_votes' : 'down_votes';
    const stmt = db.prepare(`
        UPDATE dishes 
        SET ${column} = ${column} + 1, updated_at = strftime('%s', 'now')
        WHERE id = ?
    `);
    return stmt.run(id);
}

// ===== 厨师相关 =====

function getAllChefs() {
    return db.prepare('SELECT * FROM chefs ORDER BY daily_rank ASC').all();
}

function getChef(id) {
    return db.prepare('SELECT * FROM chefs WHERE id = ?').get(id);
}

function createChef(data) {
    const stmt = db.prepare(`
        INSERT INTO chefs (name, role, photo, description, daily_rank, monthly_rank, monthly_votes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
        data.name, 
        data.role, 
        data.photo || 'static/logo.png',
        data.description || '',
        data.daily_rank || 99,
        data.monthly_rank || 99,
        data.monthly_votes || 0
    );
}

function updateChef(id, data) {
    const stmt = db.prepare(`
        UPDATE chefs 
        SET name = ?, role = ?, photo = ?, description = ?, 
            daily_rank = ?, monthly_rank = ?, monthly_votes = ?,
            updated_at = strftime('%s', 'now')
        WHERE id = ?
    `);
    return stmt.run(
        data.name, 
        data.role, 
        data.photo,
        data.description,
        data.daily_rank,
        data.monthly_rank,
        data.monthly_votes,
        id
    );
}

function deleteChef(id) {
    return db.prepare('DELETE FROM chefs WHERE id = ?').run(id);
}

// ===== 论坛相关 =====

function getAllPosts(page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;
    return db.prepare(`
        SELECT * FROM forum_posts 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
    `).all(pageSize, offset);
}

function getPostsCount() {
    return db.prepare('SELECT COUNT(*) as count FROM forum_posts').get().count;
}

function createPost(content, deviceId) {
    const stmt = db.prepare('INSERT INTO forum_posts (content, device_id) VALUES (?, ?)');
    return stmt.run(content, deviceId);
}

function getPost(id) {
    return db.prepare('SELECT * FROM forum_posts WHERE id = ?').get(id);
}

function deletePost(id, deviceId) {
    const post = getPost(id);
    if (!post) {
        throw new Error('帖子不存在');
    }
    
    // 验证设备ID
    if (post.device_id !== deviceId) {
        throw new Error('无权删除此帖子');
    }
    
    // 验证时间（30分钟内）
    const now = Math.floor(Date.now() / 1000);
    const postTime = post.created_at;
    const timeDiff = now - postTime;
    const thirtyMinutes = 30 * 60; // 30分钟（秒）
    
    if (timeDiff > thirtyMinutes) {
        throw new Error('帖子超过30分钟，无法删除');
    }
    
    // 删除帖子（级联删除会自动删除相关评论）
    return db.prepare('DELETE FROM forum_posts WHERE id = ?').run(id);
}

function likePost(id, action) {
    const change = action === 'like' ? 1 : -1;
    const stmt = db.prepare(`
        UPDATE forum_posts 
        SET likes = MAX(0, likes + ?)
        WHERE id = ?
    `);
    stmt.run(change, id);
    return db.prepare('SELECT likes FROM forum_posts WHERE id = ?').get(id);
}

// ===== 评论相关 =====

function getCommentsByPostId(postId) {
    return db.prepare(`
        SELECT * FROM forum_comments 
        WHERE post_id = ? 
        ORDER BY created_at ASC
    `).all(postId);
}

function createComment(postId, content, deviceId) {
    const stmt = db.prepare('INSERT INTO forum_comments (post_id, content, device_id) VALUES (?, ?, ?)');
    return stmt.run(postId, content, deviceId);
}

function getComment(id) {
    return db.prepare('SELECT * FROM forum_comments WHERE id = ?').get(id);
}

function deleteComment(id, deviceId) {
    const comment = getComment(id);
    if (!comment) {
        throw new Error('评论不存在');
    }
    
    // 验证设备ID
    if (comment.device_id !== deviceId) {
        throw new Error('无权删除此评论');
    }
    
    // 验证时间（30分钟内）
    const now = Math.floor(Date.now() / 1000);
    const commentTime = comment.created_at;
    const timeDiff = now - commentTime;
    const thirtyMinutes = 30 * 60; // 30分钟（秒）
    
    if (timeDiff > thirtyMinutes) {
        throw new Error('评论超过30分钟，无法删除');
    }
    
    // 删除评论
    return db.prepare('DELETE FROM forum_comments WHERE id = ?').run(id);
}

// ===== 数据迁移（从JSON） =====

function migrateFromJSON() {
    const dataFile = path.join(__dirname, 'data.json');
    const forumFile = path.join(__dirname, 'forum-data.json');
    
    try {
        // 迁移餐厅数据
        if (fs.existsSync(dataFile)) {
            const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
            
            // 迁移配置
            if (data.config) {
                updateConfig({
                    title: data.config.title || '餐厅看板系统',
                    date_location: data.config.date || '',
                    auto_date: false  // 保持原有日期
                });
            }
            
            // 迁移菜品
            if (data.dishes && data.dishes.length > 0) {
                const existingDishes = getAllDishes();
                if (existingDishes.length === 0) {
                    const insertDish = db.prepare(`
                        INSERT INTO dishes (name, chef, up_votes, down_votes)
                        VALUES (?, ?, ?, ?)
                    `);
                    const insertMany = db.transaction((dishes) => {
                        for (const dish of dishes) {
                            insertDish.run(dish.name, dish.chef, dish.up || 0, dish.down || 0);
                        }
                    });
                    insertMany(data.dishes);
                    console.log(`✅ 已迁移 ${data.dishes.length} 道菜品`);
                }
            }
            
            // 迁移厨师
            if (data.chefs && data.chefs.length > 0) {
                const existingChefs = getAllChefs();
                if (existingChefs.length === 0) {
                    const insertChef = db.prepare(`
                        INSERT INTO chefs (name, role, photo, description, daily_rank, monthly_rank, monthly_votes)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    `);
                    const insertMany = db.transaction((chefs) => {
                        for (const chef of chefs) {
                            insertChef.run(
                                chef.name,
                                chef.role,
                                chef.photo || 'static/logo.png',
                                chef.desc || '',
                                chef.daily_rank || 99,
                                chef.monthly_rank || 99,
                                chef.monthly_votes || 0
                            );
                        }
                    });
                    insertMany(data.chefs);
                    console.log(`✅ 已迁移 ${data.chefs.length} 位厨师`);
                }
            }
        }
        
        // 迁移论坛数据
        if (fs.existsSync(forumFile)) {
            const forumData = JSON.parse(fs.readFileSync(forumFile, 'utf8'));
            if (forumData.posts && forumData.posts.length > 0) {
                const existingPosts = getAllPosts();
                if (existingPosts.length === 0) {
                    const insertPost = db.prepare(`
                        INSERT INTO forum_posts (id, content, likes, created_at)
                        VALUES (?, ?, ?, ?)
                    `);
                    const insertMany = db.transaction((posts) => {
                        for (const post of posts) {
                            insertPost.run(post.id, post.content, post.likes || 0, Math.floor(post.timestamp / 1000));
                        }
                    });
                    insertMany(forumData.posts);
                    console.log(`✅ 已迁移 ${forumData.posts.length} 条帖子`);
                }
            }
        }
        
        return true;
    } catch (err) {
        console.error('数据迁移失败:', err);
        return false;
    }
}

// 导出函数
module.exports = {
    initDatabase,
    migrateFromJSON,
    
    // 配置
    getConfig,
    updateConfig,
    
    // 菜品
    getAllDishes,
    getDish,
    createDish,
    updateDish,
    deleteDish,
    voteDish,
    
    // 厨师
    getAllChefs,
    getChef,
    createChef,
    updateChef,
    deleteChef,
    
    // 论坛
    getAllPosts,
    getPostsCount,
    createPost,
    getPost,
    deletePost,
    likePost,
    
    // 评论
    getCommentsByPostId,
    createComment,
    getComment,
    deleteComment,
    
    // 关闭数据库
    close: () => db.close()
};


