# CHU TEA - 一键部署指南（腾讯云 43.166.239.99）

## 🚀 快速部署步骤

### 第一步：SSH 登录到您的腾讯云服务器

```bash
ssh root@43.166.239.99
```

输入您的 root 密码登录。

---

### 第二步：下载部署脚本

```bash
# 方法 A：直接从 GitHub 克隆仓库
cd /root
git clone https://github.com/jaosnxu/CTEA.git
cd CTEA

# 方法 B：如果服务器上已有项目文件，直接进入目录
cd /var/www/chutea  # 或您的项目目录
```

---

### 第三步：执行一键部署脚本

```bash
# 确保脚本有执行权限
chmod +x deploy-oneclick.sh

# 以 root 权限运行部署脚本
sudo bash deploy-oneclick.sh
```

**脚本会自动完成以下任务：**

1. ✅ 安装 Node.js 18、pnpm、PM2、Nginx
2. ✅ 克隆 GitHub 仓库到 `/var/www/chutea`
3. ✅ 初始化数据库 `chutea_db`（创建表 + 插入 10 个 SKU）
4. ✅ 安装项目依赖并构建前端
5. ✅ 配置 Nginx（端口 80 → 3000 反向代理）
6. ✅ 启动 PM2 后端进程
7. ✅ 运行自动化验证测试

**预计执行时间：** 5-10 分钟（取决于网络速度）

---

### 第四步：验证部署结果

脚本执行完成后，您会看到以下输出：

```
========================================
Deployment Summary
========================================
Frontend URL:      http://43.166.239.99
Admin Panel:       http://43.166.239.99/admin/products
Order Page:        http://43.166.239.99/order
API Endpoint:      http://43.166.239.99/trpc
Database:          chutea_db (10 products)
PM2 Process:       chutea-backend (running)
========================================
```

---

## 🧪 实时同步测试（关键验证）

### 测试目标

验证 **"后台改价 → 前端秒级联动更新"** 功能是否正常工作。

### 测试步骤

#### 1. 打开两个浏览器窗口

- **窗口 A（管理后台）：** `http://43.166.239.99/admin/products`
- **窗口 B（前台点单页）：** `http://43.166.239.99/order`

#### 2. 记录初始价格

在窗口 B 中，找到第一个产品 **"Клубничный Чиз"（草莓芝士）**，记录当前价格（例如：₽500）。

#### 3. 后台修改价格

在窗口 A 中：

1. 点击 **"Клубничный Чиз"** 旁边的 **"Edit Price"** 按钮
2. 将价格改为 **₽550**
3. 点击 **"Save"** 保存

#### 4. 观察前端自动更新

**不要刷新窗口 B！** 在 1 秒内，您应该看到：

- 价格自动从 **₽500** 更新为 **₽550**
- 产品旁边出现 **"Manual"** 标签（表示手动覆盖已激活）

#### 5. 验证 `is_manual_override` 标志

SSH 登录服务器，执行以下命令：

```bash
sudo -u postgres psql -d chutea_db -c "SELECT id, name_ru, price, is_manual_override FROM products WHERE id = 1;"
```

**预期输出：**

```
 id |     name_ru      | price  | is_manual_override
----+------------------+--------+--------------------
  1 | Клубничный Чиз   | 550.00 | t
```

✅ `is_manual_override` 应该为 `t`（true），表示该产品已被手动修改，不会被 IIKO 同步覆盖。

---

## 🔧 常见问题排查

### 问题 1：Nginx 502 Bad Gateway

**原因：** PM2 后端进程未启动或崩溃

**解决方案：**

```bash
# 检查 PM2 状态
pm2 status

# 如果进程不在线，重启
pm2 restart chutea-backend

# 查看错误日志
pm2 logs chutea-backend --lines 50
```

---

### 问题 2：前端页面空白

**原因：** 前端构建失败或 Nginx 配置错误

**解决方案：**

```bash
# 检查前端构建产物是否存在
ls -la /var/www/chutea/client/dist

# 如果不存在，重新构建
cd /var/www/chutea/client
pnpm run build

# 重启 Nginx
systemctl restart nginx
```

---

### 问题 3：实时同步不工作

**原因：** WebSocket 连接失败或 tRPC 配置错误

**解决方案：**

```bash
# 检查 Nginx WebSocket 配置
grep -A 5 "location /trpc" /etc/nginx/sites-available/chutea

# 应该包含以下行：
# proxy_set_header Upgrade $http_upgrade;
# proxy_set_header Connection "upgrade";

# 重启 Nginx 和 PM2
systemctl reload nginx
pm2 restart chutea-backend
```

**浏览器端检查：**

1. 打开浏览器开发者工具（F12）
2. 切换到 **Network** 标签
3. 过滤 **WS**（WebSocket）
4. 刷新页面，应该看到一个活跃的 WebSocket 连接

---

### 问题 4：数据库连接失败

**原因：** `DATABASE_URL` 配置错误或 PostgreSQL 未启动

**解决方案：**

```bash
# 检查 PostgreSQL 状态
systemctl status postgresql

# 如果未启动，启动服务
systemctl start postgresql

# 测试数据库连接
sudo -u postgres psql -d chutea_db -c "SELECT 1;"

# 检查 .env.production 配置
cat /var/www/chutea/.env.production | grep DATABASE_URL
```

---

## 📊 部署后检查清单

| 检查项         | 命令                                                                                                        | 预期结果              | 状态 |
| -------------- | ----------------------------------------------------------------------------------------------------------- | --------------------- | ---- |
| **Nginx 运行** | `systemctl status nginx`                                                                                    | Active (running)      | ⬜   |
| **PM2 运行**   | `pm2 status`                                                                                                | chutea-backend online | ⬜   |
| **数据库连接** | `sudo -u postgres psql -d chutea_db -c "SELECT COUNT(*) FROM products;"`                                    | 10                    | ⬜   |
| **前端可访问** | `curl -I http://43.166.239.99`                                                                              | HTTP/1.1 200 OK       | ⬜   |
| **API 可访问** | `curl -X POST http://43.166.239.99/trpc/products.list -H "Content-Type: application/json" -d '{"json":{}}'` | JSON 响应包含产品列表 | ⬜   |
| **实时同步**   | 后台改价 → 前端自动更新                                                                                     | 1 秒内更新            | ⬜   |

---

## 🎯 下一步行动

部署成功后，建议完成以下任务：

### 1. 配置 HTTPS（推荐）

```bash
# 安装 Certbot
apt-get install -y certbot python3-certbot-nginx

# 获取 SSL 证书（需要域名）
certbot --nginx -d yourdomain.com

# 自动续期测试
certbot renew --dry-run
```

### 2. 配置防火墙

```bash
# 安装 ufw
apt-get install -y ufw

# 允许 SSH、HTTP、HTTPS
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp

# 启用防火墙
ufw enable
```

### 3. 设置自动备份

```bash
# 创建备份脚本
cat > /root/backup-chutea.sh <<'BACKUP'
#!/bin/bash
BACKUP_DIR="/root/backups"
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d_%H%M%S)

# 备份数据库
sudo -u postgres pg_dump chutea_db > $BACKUP_DIR/chutea_db_$DATE.sql

# 保留最近 7 天的备份
find $BACKUP_DIR -name "chutea_db_*.sql" -mtime +7 -delete

echo "Backup completed: chutea_db_$DATE.sql"
BACKUP

chmod +x /root/backup-chutea.sh

# 添加到 crontab（每天凌晨 2 点备份）
(crontab -l 2>/dev/null; echo "0 2 * * * /root/backup-chutea.sh") | crontab -
```

### 4. 集成真实支付网关

编辑 `/var/www/chutea/.env.production`，添加 Tinkoff 或 YooKassa API 凭证：

```bash
# Tinkoff
TINKOFF_MERCHANT_ID=your_merchant_id
TINKOFF_SECRET_KEY=your_secret_key

# 或 YooKassa
YOOKASSA_SHOP_ID=your_shop_id
YOOKASSA_SECRET_KEY=your_secret_key
```

重启 PM2：

```bash
pm2 restart chutea-backend
```

### 5. 连接 IIKO POS API

编辑 `/var/www/chutea/.env.production`，添加 IIKO 凭证：

```bash
IIKO_API_URL=https://api-ru.iiko.services
IIKO_API_LOGIN=your_iiko_login
IIKO_API_PASSWORD=your_iiko_password
IIKO_ORGANIZATION_ID=your_org_id
FEATURE_IIKO_SYNC=true
```

重启 PM2：

```bash
pm2 restart chutea-backend
```

---

## 📞 技术支持

如果部署过程中遇到问题，请检查以下日志：

```bash
# PM2 日志
pm2 logs chutea-backend --lines 100

# Nginx 错误日志
tail -f /var/log/nginx/chutea-error.log

# PostgreSQL 日志
tail -f /var/log/postgresql/postgresql-*.log
```

---

## ✅ 部署完成确认

当您看到以下结果时，表示部署成功：

1. ✅ 浏览器访问 `http://43.166.239.99` 显示 CHU TEA 首页
2. ✅ 访问 `http://43.166.239.99/admin/products` 显示管理后台
3. ✅ 访问 `http://43.166.239.99/order` 显示 10 个产品
4. ✅ 后台修改价格后，前端 1 秒内自动更新
5. ✅ 数据库 `is_manual_override` 字段正确设置为 `true`

**恭喜！CHU TEA 平台已成功部署到腾讯云！** 🎉

---

**文档版本：** 1.0  
**最后更新：** 2026年1月6日  
**目标服务器：** 43.166.239.99  
**准备者：** Manus AI
