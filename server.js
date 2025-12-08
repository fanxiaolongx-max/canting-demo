const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer'); // 引入图片上传处理库

// const app = express();
// const PORT = 3010;
const PORT = process.env.PORT || 3010;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`前台地址: http://localhost:${PORT}`);
    console.log(`后台地址: http://localhost:${PORT}/admin.html`);
});


app.use(express.json());
app.use(express.static(__dirname));

const DATA_FILE = path.join(__dirname, 'data.json');

// --- 配置图片上传 ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'static/') // 图片保存到 static 文件夹
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

app.listen(PORT, () => {
    console.log(`前台地址: http://localhost:${PORT}`);
    console.log(`后台地址: http://localhost:${PORT}/admin.html`);

});
