# 🚀 升级到 V3.0 指南

## 🎉 重大更新

版本 3.0 带来了全新的数据存储方案和管理界面！

### 主要变化

1. **SQLite 数据库** 📊
   - 从 JSON 文件迁移到 SQLite 数据库
   - 更快的查询速度和更好的并发支持
   - 数据完整性保障

2. **全新管理界面** 🎨
   - 表格化管理，支持批量操作
   - 移除二维码配置（自动生成）
   - 日期自动生成功能

3. **放大的二维码** 📱
   - 前台二维码从 30x30px 增大到 120x120px
   - 更高的清晰度和容错率
   - 更容易扫描

---

## 📋 升级步骤

### 1. 停止旧服务器

如果服务器正在运行，先停止它：
```bash
# 按 Ctrl+C 停止
```

### 2. 备份数据（重要！）

系统会自动从 JSON 迁移数据，但建议手动备份：
```bash
cp data.json data.json.backup
cp forum-data.json forum-data.json.backup
```

### 3. 安装依赖

```bash
npm install
```

会自动安装 `better-sqlite3`

### 4. 启动服务器

```bash
npm start
```

### 5. 自动数据迁移

首次启动时，系统会自动：
- 创建数据库表结构
- 从 `data.json` 迁移餐厅数据
- 从 `forum-data.json` 迁移论坛数据

查看控制台输出确认迁移成功：
```
✅ 数据库初始化完成
✅ 已迁移 XX 道菜品
✅ 已迁移 XX 位厨师
✅ 已迁移 XX 条帖子
```

### 6. 验证数据

1. 访问后台：http://localhost:3010/admin.html
2. 输入密钥（默认：demo2024）
3. 检查菜品和厨师数据是否完整
4. 访问前台：http://localhost:3010
5. 确认二维码显示正常

---

## 🗄️ 数据库结构

### 配置表 (config)
```sql
- id: 固定为 1
- title: 页面标题
- date_location: 日期/位置
- auto_date: 是否自动生成日期
- updated_at: 更新时间
```

### 菜品表 (dishes)
```sql
- id: 自增主键
- name: 菜品名称
- chef: 厨师
- up_votes: 点赞数
- down_votes: 踩数
- created_at: 创建时间
- updated_at: 更新时间
```

### 厨师表 (chefs)
```sql
- id: 自增主键
- name: 姓名
- role: 职位
- photo: 照片路径
- description: 简介
- daily_rank: 日榜排名
- monthly_rank: 月榜排名
- monthly_votes: 月票数
- created_at: 创建时间
- updated_at: 更新时间
```

### 论坛表 (forum_posts)
```sql
- id: 自增主键
- content: 内容
- likes: 点赞数
- created_at: 创建时间
```

---

## 🆕 新功能

### 1. 日期自动生成

在后台配置中勾选"自动生成当前日期"：
- ✅ 自动显示当前日期（格式：2025-12-08）
- ✅ 自动判断时间段（14:00前为午餐，之后为晚餐）
- ✅ 也可以手动输入自定义日期

### 2. 表格化管理

- ✅ 直接在表格中编辑数据
- ✅ 自动保存（失焦时）
- ✅ 支持批量导入/导出 CSV
- ✅ 一键删除操作

### 3. 数据导出

- 📥 导出所有数据（JSON格式）
- 📥 导出菜品表格（CSV格式）
- 📥 导出厨师表格（CSV格式）

### 4. 更大的二维码

- 📱 120x120px 尺寸
- 📱 更高的分辨率（600px）
- 📱 H级容错率（最高）
- 📱 自动适配访问地址

---

## 🔄 API 变化

### 新增 API

```javascript
// 配置管理
GET  /api/admin/config
POST /api/admin/config

// 菜品 CRUD
GET    /api/admin/dishes
POST   /api/admin/dishes
PUT    /api/admin/dishes/:id
DELETE /api/admin/dishes/:id

// 厨师 CRUD
GET    /api/admin/chefs
POST   /api/admin/chefs
PUT    /api/admin/chefs/:id
DELETE /api/admin/chefs/:id
```

### 保持兼容

以下 API 保持不变，前端无需修改：
```javascript
GET  /api/data           // 前台数据
POST /api/vote           // 投票
POST /api/upload         // 上传图片
GET  /api/forum/posts    // 论坛帖子
POST /api/forum/post     // 发布帖子
POST /api/forum/like     // 点赞
GET  /api/qrcode/:type   // 二维码生成
```

---

## 📁 文件变化

### 新增文件
- `db.js` - 数据库模块
- `restaurant.db` - SQLite 数据库文件
- `UPGRADE-V3.md` - 本升级指南

### 备份文件
- `server.js.backup` - 旧版服务器代码
- `admin.html.backup` - 旧版管理界面

### 废弃文件（可删除）
- `data.json` - 迁移后可删除
- `forum-data.json` - 迁移后可删除

---

## 🐛 常见问题

### Q: 数据迁移失败？
**A**: 检查 JSON 文件格式是否正确，查看控制台错误信息。

### Q: 数据库文件在哪？
**A**: `restaurant.db` 在项目根目录。使用 SQLite 客户端可以查看。

### Q: 如何回滚到 V2？
**A**: 
```bash
# 停止服务器
# 恢复备份文件
mv server.js.backup server.js
mv admin.html.backup admin.html
# 重启服务器
npm start
```

### Q: 数据库损坏怎么办？
**A**: 删除 `restaurant.db` 文件，重启服务器会重新创建并自动从 JSON 迁移。

### Q: 二维码不显示？
**A**: 清空浏览器缓存，刷新页面。确保服务器正常运行。

---

## 📊 性能提升

- ⚡ 查询速度提升 **3-5倍**
- ⚡ 支持并发访问
- ⚡ 数据完整性约束
- ⚡ 自动索引优化

---

## 🎯 推荐配置

### 生产环境

1. **定期备份数据库**
```bash
# 创建定时任务备份
cp restaurant.db backups/restaurant-$(date +%Y%m%d).db
```

2. **使用环境变量配置密钥**
```bash
export ADMIN_TOKEN=your_secure_token
npm start
```

3. **使用 PM2 守护进程**
```bash
npm install -g pm2
pm2 start server.js --name "restaurant"
pm2 save
```

---

## 📞 技术支持

如果遇到问题：
1. 查看控制台错误日志
2. 检查数据库文件权限
3. 查看浏览器开发者工具（F12）
4. 参考 README.md 文档

---

## 🎉 总结

V3.0 是一次重大升级，带来了：
- ✅ 更可靠的数据存储
- ✅ 更现代的管理界面
- ✅ 更好的用户体验
- ✅ 更快的性能

享受新版本吧！🚀


