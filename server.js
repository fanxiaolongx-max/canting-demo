const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer'); // 引入图片上传处理库

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

const DATA_DIR = process.env.DATA_DIR || '/data';
const DEFAULT_DATA_FILE = path.join(__dirname, 'data.json');
const DATA_FILE = path.join(DATA_DIR, 'data.json');
const DEFAULT_STATIC_DIR = path.join(__dirname, 'static');
const UPLOAD_DIR = path.join(DATA_DIR, 'static');

function ensureDirectory(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

ensureDirectory(DATA_DIR);
ensureDirectory(UPLOAD_DIR);

if (!fs.existsSync(DATA_FILE)) {
    if (fs.existsSync(DEFAULT_DATA_FILE)) {
        fs.copyFileSync(DEFAULT_DATA_FILE, DATA_FILE);
    } else {
        fs.writeFileSync(DATA_FILE, JSON.stringify({ dishes: [], chefs: [], config: {} }, null, 2));
    }
}

if (fs.existsSync(DEFAULT_STATIC_DIR)) {
    fs.readdirSync(DEFAULT_STATIC_DIR).forEach((file) => {
        const sourcePath = path.join(DEFAULT_STATIC_DIR, file);
        const targetPath = path.join(UPLOAD_DIR, file);
        if (!fs.existsSync(targetPath)) {
            fs.copyFileSync(sourcePath, targetPath);
        }
    });
}

app.use(express.json());
app.use(express.static(__dirname));
app.use('/static', express.static(UPLOAD_DIR));

// --- 配置图片上传 ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOAD_DIR); // 图片保存到静态资源目录
    },
    filename: function (req, file, cb) {
        // 给图片起名：时间戳 + 原始后缀 (防止重名)
        const ext = path.extname(file.originalname);
        cb(null, 'img-' + Date.now() + ext)
    }
});
const upload = multer({ storage: storage });

// --- 接口区域 ---

// 1. 获取数据
app.get('/api/data', (req, res) => {
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) return res.status(500).send('读取数据失败');
        res.json(JSON.parse(data));
    });
});

// 2. 保存全部数据 (后台管理用)
app.post('/api/save', (req, res) => {
    const newData = req.body;
    fs.writeFile(DATA_FILE, JSON.stringify(newData, null, 2), (err) => {
        if (err) return res.status(500).json({ error: '写入失败' });
        res.json({ success: true });
    });
});

// 3. 上传图片接口
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: '无文件' });
    }
    // 返回给前端图片的访问路径
    res.json({ url: 'static/' + req.file.filename });
});

// 4. 投票接口
app.post('/api/vote', (req, res) => {
    const { dishId, type } = req.body;
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) return res.status(500).send('读取失败');
        let jsonData = JSON.parse(data);
        const dish = jsonData.dishes.find(d => d.id === dishId);
        if (dish) {
            if (type === 'up') dish.up += 1;
            if (type === 'down') dish.down += 1;
            jsonData.dishes.sort((a, b) => b.up - a.up);
            fs.writeFile(DATA_FILE, JSON.stringify(jsonData, null, 2), (err) => {
                if (err) return res.status(500).send('写入失败');
                res.json({ success: true, newData: jsonData });
            });
        } else {
            res.status(404).send('菜品未找到');
        }
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`前台地址: http://localhost:${PORT}`);
    console.log(`后台地址: http://localhost:${PORT}/admin.html`);

});
