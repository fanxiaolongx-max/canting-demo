# ⚡ 快速开始指南

## 🚀 5分钟上手

### 步骤 1: 安装依赖
```bash
npm install
```

### 步骤 2: 启动服务器
```bash
npm start
```

控制台会显示：
```
==================================================
🍽️  餐厅看板系统已启动 v2.0
==================================================
📺 前台地址: http://localhost:3010
⚙️  后台地址: http://localhost:3010/admin.html
📱 手机投票: http://localhost:3010/mobile-vote.html
💬 心声墙: http://localhost:3010/mobile-forum.html
🔑 管理密钥: demo2024
💾 数据库: restaurant.db (SQLite)
==================================================
```

### 步骤 3: 访问系统

#### 前台大屏
1. 浏览器打开：http://localhost:3010
2. 看到菜品排行榜和厨师榜
3. 右下角有两个放大的二维码

#### 后台管理
1. 浏览器打开：http://localhost:3010/admin.html
2. 输入密钥：`demo2024`
3. 在表格中直接编辑数据

---

## 📱 手机端使用

### 方式 1: 扫码（推荐）
1. 打开前台大屏页面
2. 用手机扫描二维码
3. 跳转到投票页面或心声墙

### 方式 2: 直接访问
- 投票：http://localhost:3010/mobile-vote.html
- 论坛：http://localhost:3010/mobile-forum.html

---

## ⚙️ 基本配置

### 修改密钥
```bash
# 使用环境变量
export ADMIN_TOKEN=your_password
npm start
```

### 修改端口
编辑 `server.js`:
```javascript
const PORT = 3010;  // 改成你想要的端口
```

---

## 📊 管理数据

### 添加菜品
1. 进入后台管理
2. 点击"➕ 新增菜品"按钮
3. 在表格中修改菜品信息
4. 失焦自动保存

### 上传厨师照片
1. 在厨师表格中
2. 点击照片
3. 选择新图片
4. 自动上传并保存

### 导出数据
1. 点击顶部"📥 导出所有数据"
2. 会下载一个 JSON 文件
3. 包含所有配置、菜品、厨师数据

---

## 🔧 局域网访问

如果需要同一局域网的设备访问：

### 1. 获取本机 IP
```bash
# macOS/Linux
ifconfig | grep "inet "

# Windows
ipconfig
```

假设得到 IP: `192.168.1.100`

### 2. 访问地址
- 前台：http://192.168.1.100:3010
- 后台：http://192.168.1.100:3010/admin.html
- 手机投票：http://192.168.1.100:3010/mobile-vote.html

### 3. 二维码会自动适配
二维码会根据访问地址自动生成，无需手动配置。

---

## 💡 使用技巧

### 自动日期功能
1. 后台配置中勾选"自动生成当前日期"
2. 系统会自动显示：
   - 当前日期（2025-12-08）
   - 时间段（14:00前为午餐，之后为晚餐）

### 表格快捷操作
- **Tab键**：在单元格间快速切换
- **Enter键**：确认输入并移到下一行
- **直接编辑**：点击即可编辑，失焦自动保存

### 批量导入菜品
1. 准备 CSV 文件：
```csv
菜品名称,厨师,点赞数,踩数
小炒黄牛肉,雷云龙,0,0
麻辣水煮鱼,彭刘锋,0,0
```
2. 点击"📤 批量导入"
3. 选择文件上传

---

## 🐛 常见问题

### Q: 无法启动服务器？
```bash
# 检查端口是否被占用
lsof -i :3010

# 更换端口或关闭占用端口的程序
```

### Q: 手机扫码后无法访问？
确保：
- ✅ 手机和电脑在同一局域网
- ✅ 使用电脑的局域网 IP（不是 localhost）
- ✅ 防火墙允许 3010 端口访问

### Q: 后台密钥忘记了？
```bash
# 查看当前密钥
echo $ADMIN_TOKEN

# 或者查看 server.js 默认值
grep ADMIN_TOKEN server.js
```

### Q: 数据丢失了？
数据库文件：`restaurant.db`
- 定期备份这个文件
- 删除文件会重新创建并从 JSON 迁移

---

## 📚 更多文档

- **完整文档**: [README.md](README.md)
- **升级指南**: [UPGRADE-V3.md](UPGRADE-V3.md)
- **二维码使用**: [QR-CODE-GUIDE.md](QR-CODE-GUIDE.md)
- **改进清单**: [IMPROVEMENTS.md](IMPROVEMENTS.md)

---

## 🎯 下一步

1. ✅ 启动系统
2. ✅ 添加真实菜品数据
3. ✅ 上传厨师照片
4. ✅ 测试手机端扫码
5. ✅ 配置自动日期
6. 🚀 开始使用！

---

## 💪 生产环境部署

### 使用 PM2 守护进程
```bash
# 安装 PM2
npm install -g pm2

# 启动
pm2 start server.js --name restaurant

# 查看状态
pm2 status

# 查看日志
pm2 logs restaurant

# 设置开机自启
pm2 startup
pm2 save
```

### 定期备份数据库
```bash
# 添加到 crontab
# 每天凌晨2点备份
0 2 * * * cp /path/to/restaurant.db /path/to/backups/restaurant-$(date +\%Y\%m\%d).db
```

---

## 🎉 开始享受吧！

现在你已经完全掌握了系统的使用！
如有问题，随时查看文档或检查日志。

祝你使用愉快！🍽️


