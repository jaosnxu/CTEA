# CHU TEA Platform - Tencent Cloud Deployment Guide

**Target Environment:** Tencent Cloud CVM (Cloud Virtual Machine)  
**Operating System:** Ubuntu 22.04 LTS  
**Deployment Method:** PM2 + Nginx + PostgreSQL  
**Prepared by:** Manus AI  
**Date:** January 6, 2026

---

## Prerequisites

Before starting the deployment, ensure you have the following:

### 1. Tencent Cloud Resources

| Resource | Specification | Purpose |
|----------|---------------|---------|
| **CVM Instance** | 2 vCPU, 4GB RAM minimum | Application server |
| **Public IP** | Static IP address | External access |
| **Security Group** | Ports 80, 443, 22 open | HTTP/HTTPS/SSH |
| **Domain Name** | Registered and DNS configured | Production URL |
| **SSL Certificate** | Let's Encrypt or purchased | HTTPS encryption |

### 2. Third-Party Services

| Service | Status | Required For |
|---------|--------|--------------|
| **GitHub Account** | ✅ Ready | Code repository (jaosnxu/CTEA) |
| **Tinkoff/YooKassa** | ⏳ Pending | Payment processing |
| **IIKO POS** | ⏳ Pending | Order synchronization |
| **Telegram Bot** | ⏳ Optional | Telegram Mini App |

### 3. Local Tools

- SSH client (Terminal, PuTTY, or similar)
- Git installed locally
- Text editor for configuration files

---

## Deployment Steps

### Step 1: Connect to Tencent Cloud CVM

```bash
# SSH into your Tencent Cloud server
ssh root@YOUR_PUBLIC_IP

# Update system hostname (optional)
hostnamectl set-hostname chutea-prod
```

### Step 2: Clone Project Repository

```bash
# Install Git if not already installed
apt-get update && apt-get install -y git

# Clone project from GitHub
cd /var/www
git clone https://github.com/jaosnxu/CTEA.git chutea
cd chutea

# Verify files
ls -la
```

**Expected Output:**
```
client/
server/
deploy-tencent.sh
nginx-chutea.conf
.env.production.template
package.json
...
```

### Step 3: Run Automated Deployment Script

```bash
# Make script executable
chmod +x deploy-tencent.sh

# Run deployment script as root
sudo bash deploy-tencent.sh
```

**What This Script Does:**

The deployment script automates the following tasks in sequence:

1. **System Update:** Updates all Ubuntu packages to latest versions
2. **Node.js Installation:** Installs Node.js 22.x and pnpm package manager
3. **PostgreSQL Setup:** Installs PostgreSQL 15 and creates production database
4. **Database Initialization:** Creates tables (products, orders, users) with indexes
5. **Dependency Installation:** Runs `pnpm install` to install all npm packages
6. **Frontend Build:** Compiles React app to static files in `client/dist`
7. **PM2 Configuration:** Sets up PM2 cluster mode with 2 instances
8. **Auto-Start Setup:** Configures PM2 to restart on server reboot

**Important:** Save the database password displayed at the end of the script output. You will need it for the next step.

### Step 4: Configure Environment Variables

```bash
# Copy template to production config
cp .env.production.template .env.production

# Edit with your favorite editor
nano .env.production
```

**Required Changes:**

Replace the following placeholders with actual values:

```bash
# Database (from deploy-tencent.sh output)
DATABASE_URL=postgresql://chutea_admin:ACTUAL_PASSWORD_HERE@localhost:5432/chutea_prod

# JWT Secret (generate new)
JWT_SECRET=$(openssl rand -base64 64)

# Public URL
PUBLIC_URL=https://your-actual-domain.com
CORS_ORIGINS=https://your-actual-domain.com

# Payment Gateway (when ready)
TINKOFF_MERCHANT_ID=your_merchant_id
TINKOFF_SECRET_KEY=your_secret_key

# IIKO API (when ready)
IIKO_API_LOGIN=your_iiko_login
IIKO_API_PASSWORD=your_iiko_password
```

**Save and exit:** Press `Ctrl+X`, then `Y`, then `Enter`

### Step 5: Configure Nginx

```bash
# Copy Nginx config to sites-available
cp nginx-chutea.conf /etc/nginx/sites-available/chutea

# Edit configuration
nano /etc/nginx/sites-available/chutea
```

**Required Changes:**

1. Replace `your-domain.com` with your actual domain (appears in 3 places)
2. Update SSL certificate paths:
   ```nginx
   ssl_certificate /etc/nginx/ssl/chutea.crt;
   ssl_certificate_key /etc/nginx/ssl/chutea.key;
   ```

**Enable site:**

```bash
# Create symlink to enable site
ln -s /etc/nginx/sites-available/chutea /etc/nginx/sites-enabled/

# Remove default site (optional)
rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# If test passes, reload Nginx
systemctl reload nginx
```

### Step 6: Obtain SSL Certificate

**Option A: Let's Encrypt (Free, Recommended)**

```bash
# Install Certbot
apt-get install -y certbot python3-certbot-nginx

# Obtain certificate (interactive)
certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal is configured automatically
certbot renew --dry-run
```

**Option B: Upload Existing Certificate**

```bash
# Create SSL directory
mkdir -p /etc/nginx/ssl

# Upload your certificate files
# (Use SCP or SFTP to upload .crt and .key files)

# Set correct permissions
chmod 600 /etc/nginx/ssl/chutea.key
chmod 644 /etc/nginx/ssl/chutea.crt
```

### Step 7: Start Application

```bash
# Restart PM2 to load new environment variables
pm2 restart chutea-backend

# Check PM2 status
pm2 status

# View logs
pm2 logs chutea-backend --lines 50
```

**Expected PM2 Status:**

```
┌─────┬──────────────────┬─────────┬─────────┬──────────┬────────┬──────────┐
│ id  │ name             │ mode    │ status  │ cpu      │ memory │ watching │
├─────┼──────────────────┼─────────┼─────────┼──────────┼────────┼──────────┤
│ 0   │ chutea-backend   │ cluster │ online  │ 0%       │ 45.2mb │ disabled │
│ 1   │ chutea-backend   │ cluster │ online  │ 0%       │ 43.8mb │ disabled │
└─────┴──────────────────┴─────────┴─────────┴──────────┴────────┴──────────┘
```

### Step 8: Configure Firewall (Tencent Cloud Security Group)

Log in to Tencent Cloud Console and configure the following inbound rules:

| Protocol | Port | Source | Purpose |
|----------|------|--------|---------|
| TCP | 22 | Your IP only | SSH access |
| TCP | 80 | 0.0.0.0/0 | HTTP (redirect to HTTPS) |
| TCP | 443 | 0.0.0.0/0 | HTTPS |
| TCP | 5432 | 127.0.0.1 | PostgreSQL (localhost only) |

**Important:** Do NOT expose port 3000 (Node.js) directly. All traffic should go through Nginx.

---

## Validation Checklist

After deployment, verify each component is working correctly:

### ✅ Phase 1: Infrastructure Validation

| Test | Command | Expected Result | Status |
|------|---------|-----------------|--------|
| **Nginx Running** | `systemctl status nginx` | Active (running) | ⬜ |
| **PostgreSQL Running** | `systemctl status postgresql` | Active (running) | ⬜ |
| **PM2 Running** | `pm2 status` | 2 instances online | ⬜ |
| **SSL Certificate** | `curl -I https://your-domain.com` | HTTP/2 200 | ⬜ |
| **HTTP Redirect** | `curl -I http://your-domain.com` | 301 → HTTPS | ⬜ |

### ✅ Phase 2: Database Validation

```bash
# Connect to PostgreSQL
sudo -u postgres psql -d chutea_prod

# Check tables exist
\dt

# Expected output:
#  public | orders   | table | chutea_admin
#  public | products | table | chutea_admin
#  public | users    | table | chutea_admin

# Check product count
SELECT COUNT(*) FROM products;

# Exit
\q
```

**Expected:** 10 products (from mock data)

### ✅ Phase 3: Frontend Validation

Open your browser and test the following URLs:

| URL | Expected Result | Status |
|-----|-----------------|--------|
| `https://your-domain.com` | Homepage loads with CHU TEA branding | ⬜ |
| `https://your-domain.com/order` | Product catalog displays 10 items | ⬜ |
| `https://your-domain.com/mall` | Merchandise page loads | ⬜ |
| `https://your-domain.com/orders` | Order history page loads | ⬜ |
| `https://your-domain.com/admin/products` | Admin panel loads | ⬜ |

**Browser Console:** Should show no JavaScript errors (press F12 to check)

### ✅ Phase 4: Backend API Validation

Test API endpoints using curl or browser DevTools:

```bash
# Test tRPC endpoint
curl -X POST https://your-domain.com/trpc/products.list \
  -H "Content-Type: application/json" \
  -d '{"json":{}}'

# Expected: JSON response with product list
```

**Browser DevTools:**
1. Open `https://your-domain.com/order`
2. Press F12 → Network tab
3. Filter by "trpc"
4. Refresh page
5. Verify `products.list` request returns 200 OK

### ✅ Phase 5: Real-Time Sync Validation

This is the critical test to verify your requirement: **"后台改价，前端能立即同步"**

**Test Procedure:**

1. **Open Two Browser Windows:**
   - Window A: `https://your-domain.com/admin/products`
   - Window B: `https://your-domain.com/order`

2. **Initial State:**
   - Note the price of Product #1 (Клубничный Чиз) in Window B
   - Example: ₽500

3. **Admin Price Change:**
   - In Window A, click "Edit Price" for Product #1
   - Change price to ₽550
   - Click "Save"

4. **Verify Real-Time Update:**
   - **DO NOT REFRESH** Window B
   - Within 1 second, the price should automatically update to ₽550
   - The "Manual" badge should appear next to the product

**Expected Behavior:**

| Time | Window A (Admin) | Window B (Order Page) |
|------|------------------|-----------------------|
| T+0s | Click "Save" | Price: ₽500 |
| T+0.5s | Success message | Price updating... |
| T+1s | Price: ₽550, Manual badge | **Price: ₽550** ✅ |

**If Update Does NOT Occur:**

Check the following:

```bash
# 1. Check PM2 logs for errors
pm2 logs chutea-backend --lines 100

# 2. Check Nginx error log
tail -f /var/log/nginx/chutea-error.log

# 3. Verify WebSocket connection in browser DevTools
# Network tab → Filter: WS → Should see active connection

# 4. Check if tRPC query invalidation is working
# Browser Console → Should see: "tRPC: Query invalidated"
```

### ✅ Phase 6: Manual Override Protection Validation

Test the Shadow DB protection mechanism:

1. **Set Manual Override:**
   - Admin panel: Change Product #1 price to ₽600
   - Verify "Manual" badge appears

2. **Simulate IIKO Sync:**
   - Navigate to `https://your-domain.com/iiko-sync-demo`
   - Click "Run IIKO Sync (Safe)"
   - Verify sync summary shows "1 Protected"

3. **Verify Price Preserved:**
   - Check Order page: Product #1 should still be ₽600
   - Admin panel: "Manual" badge should still be present

**Expected Console Output:**

```
🛡️ [PROTECTED] Product #1 "Клубничный Чиз"
   └─ Local: ₽600 (Manual Override Active)
   └─ IIKO:  ₽300 (BLOCKED)
```

---

## Troubleshooting

### Issue 1: Nginx 502 Bad Gateway

**Symptoms:** Browser shows "502 Bad Gateway" error

**Diagnosis:**

```bash
# Check if PM2 is running
pm2 status

# Check PM2 logs
pm2 logs chutea-backend --lines 50

# Check if port 3000 is listening
netstat -tulpn | grep 3000
```

**Solutions:**

```bash
# Restart PM2
pm2 restart chutea-backend

# If still failing, check environment variables
cat .env.production | grep DATABASE_URL

# Test database connection
psql postgresql://chutea_admin:PASSWORD@localhost:5432/chutea_prod -c "SELECT 1;"
```

### Issue 2: Frontend Not Loading

**Symptoms:** Blank page or 404 errors

**Diagnosis:**

```bash
# Check if frontend build exists
ls -la /var/www/chutea/client/dist

# Check Nginx configuration
nginx -t

# Check Nginx error log
tail -f /var/log/nginx/chutea-error.log
```

**Solutions:**

```bash
# Rebuild frontend
cd /var/www/chutea/client
pnpm run build

# Verify build output
ls -la dist/

# Restart Nginx
systemctl restart nginx
```

### Issue 3: Real-Time Sync Not Working

**Symptoms:** Price changes in admin panel don't update frontend automatically

**Diagnosis:**

```bash
# Check if WebSocket is enabled in Nginx
grep -A 5 "location /trpc" /etc/nginx/sites-available/chutea

# Should see:
# proxy_set_header Upgrade $http_upgrade;
# proxy_set_header Connection "upgrade";

# Check PM2 logs for tRPC errors
pm2 logs chutea-backend | grep -i trpc
```

**Solutions:**

```bash
# Ensure Nginx WebSocket config is correct
nano /etc/nginx/sites-available/chutea

# Add WebSocket headers in /trpc location block
# (Already included in nginx-chutea.conf)

# Reload Nginx
systemctl reload nginx

# Restart PM2
pm2 restart chutea-backend
```

### Issue 4: Database Connection Failed

**Symptoms:** PM2 logs show "ECONNREFUSED" or "authentication failed"

**Diagnosis:**

```bash
# Check PostgreSQL status
systemctl status postgresql

# Test connection manually
psql -U chutea_admin -d chutea_prod -h localhost

# Check DATABASE_URL in .env.production
cat .env.production | grep DATABASE_URL
```

**Solutions:**

```bash
# Verify password is correct
sudo -u postgres psql -c "\du chutea_admin"

# Reset password if needed
sudo -u postgres psql -c "ALTER USER chutea_admin WITH PASSWORD 'new_password';"

# Update .env.production with new password
nano .env.production

# Restart PM2
pm2 restart chutea-backend
```

### Issue 5: SSL Certificate Errors

**Symptoms:** Browser shows "Your connection is not private"

**Diagnosis:**

```bash
# Check certificate files exist
ls -la /etc/nginx/ssl/

# Check certificate expiration
openssl x509 -in /etc/nginx/ssl/chutea.crt -noout -dates

# Check Nginx SSL configuration
nginx -t
```

**Solutions:**

```bash
# If using Let's Encrypt, renew certificate
certbot renew --force-renewal

# If using custom certificate, re-upload files
# Ensure .crt contains full chain (certificate + intermediate CA)

# Reload Nginx
systemctl reload nginx
```

---

## Performance Optimization

After successful deployment, consider these optimizations:

### 1. Enable Redis Caching

```bash
# Install Redis
apt-get install -y redis-server

# Start Redis
systemctl start redis-server
systemctl enable redis-server

# Update .env.production
echo "REDIS_URL=redis://localhost:6379" >> .env.production

# Restart PM2
pm2 restart chutea-backend
```

### 2. Configure PM2 Log Rotation

```bash
# Install PM2 log rotate module
pm2 install pm2-logrotate

# Configure rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

### 3. Enable Nginx Rate Limiting

Edit `/etc/nginx/nginx.conf` and add to `http` block:

```nginx
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=webhook_limit:10m rate=5r/s;
```

Then apply in `/etc/nginx/sites-available/chutea`:

```nginx
location /trpc {
    limit_req zone=api_limit burst=20 nodelay;
    # ... rest of config
}
```

### 4. Setup Monitoring

```bash
# Install PM2 monitoring
pm2 install pm2-server-monit

# View metrics
pm2 monit

# Setup email alerts (optional)
pm2 install pm2-auto-pull
```

---

## Maintenance Tasks

### Daily Tasks

```bash
# Check PM2 status
pm2 status

# Check disk space
df -h

# Check recent errors
pm2 logs chutea-backend --err --lines 20
```

### Weekly Tasks

```bash
# Update system packages
apt-get update && apt-get upgrade -y

# Check SSL certificate expiration
certbot certificates

# Backup database
pg_dump -U chutea_admin chutea_prod > backup_$(date +%Y%m%d).sql
```

### Monthly Tasks

```bash
# Review Nginx access logs
tail -1000 /var/log/nginx/chutea-access.log | awk '{print $7}' | sort | uniq -c | sort -rn | head -20

# Check PM2 memory usage
pm2 list

# Restart PM2 to clear memory
pm2 restart chutea-backend
```

---

## Rollback Procedure

If deployment fails or critical issues occur:

### Quick Rollback

```bash
# Stop PM2
pm2 stop chutea-backend

# Revert to previous Git commit
cd /var/www/chutea
git log --oneline  # Find previous commit hash
git reset --hard PREVIOUS_COMMIT_HASH

# Rebuild
cd client && pnpm run build && cd ..

# Restart PM2
pm2 restart chutea-backend
```

### Full Rollback

```bash
# Stop all services
pm2 stop all
systemctl stop nginx

# Restore database backup
psql -U chutea_admin -d chutea_prod < backup_YYYYMMDD.sql

# Restore code
cd /var/www
mv chutea chutea.failed
git clone https://github.com/jaosnxu/CTEA.git chutea
cd chutea
git checkout STABLE_TAG

# Redeploy
bash deploy-tencent.sh
```

---

## Security Checklist

### ✅ Server Security

- [ ] SSH key-based authentication enabled (password login disabled)
- [ ] Firewall configured (only ports 22, 80, 443 open)
- [ ] Fail2ban installed and configured
- [ ] Automatic security updates enabled
- [ ] Non-root user created for application (optional but recommended)

### ✅ Application Security

- [ ] All `.env` files excluded from Git (check `.gitignore`)
- [ ] JWT secret is strong random string (64+ characters)
- [ ] Database password is strong random string (32+ characters)
- [ ] CORS origins restricted to production domain only
- [ ] Rate limiting enabled in Nginx
- [ ] SQL injection protection (using parameterized queries)

### ✅ SSL/TLS Security

- [ ] SSL certificate valid and not expired
- [ ] TLS 1.2+ only (TLS 1.0/1.1 disabled)
- [ ] HSTS header enabled
- [ ] OCSP stapling enabled
- [ ] SSL Labs test score A or higher

**Test SSL Configuration:**

```bash
# Online test
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=your-domain.com

# Command line test
nmap --script ssl-enum-ciphers -p 443 your-domain.com
```

---

## Support & Resources

### Documentation

- **Architecture:** `/var/www/chutea/ARCHITECTURE.md`
- **Database Schema:** `/var/www/chutea/SCHEMA.md`
- **Test Report:** `/var/www/chutea/TEST_REPORT.md`
- **Executive Summary:** `/var/www/chutea/EXECUTIVE_SUMMARY.md`

### Logs

- **PM2 Logs:** `pm2 logs chutea-backend`
- **Nginx Access:** `/var/log/nginx/chutea-access.log`
- **Nginx Error:** `/var/log/nginx/chutea-error.log`
- **PostgreSQL:** `/var/log/postgresql/postgresql-15-main.log`

### Useful Commands

```bash
# Check all services status
systemctl status nginx postgresql
pm2 status

# Restart all services
systemctl restart nginx
pm2 restart chutea-backend

# View real-time logs
pm2 logs chutea-backend --lines 100 --raw

# Check database connections
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity WHERE datname='chutea_prod';"

# Test API endpoint
curl -X POST https://your-domain.com/trpc/products.list \
  -H "Content-Type: application/json" \
  -d '{"json":{}}'
```

---

## Conclusion

This deployment guide provides a comprehensive checklist for deploying the CHU TEA platform on Tencent Cloud. The most critical validation is the **real-time price synchronization test** (Phase 5), which confirms that admin price changes propagate to the frontend within 1 second without manual refresh.

After completing all validation steps, your platform will be production-ready for the Russian market. The next steps involve integrating real payment gateways (Tinkoff/YooKassa) and connecting the IIKO POS API for live order synchronization.

---

**Deployment Guide Version:** 1.0  
**Last Updated:** January 6, 2026  
**Prepared by:** Manus AI Development Team
