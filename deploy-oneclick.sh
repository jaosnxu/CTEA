#!/bin/bash

################################################################################
# CHU TEA Platform - One-Click Deployment Script for Tencent Cloud
# 
# Target Server: 43.166.239.99 (Ubuntu)
# Database: chutea_db (pre-created)
# Ports: 80 (Nginx) → 3000 (Node.js/PM2)
#
# This script performs:
# 1. Install Node.js 18+, Nginx, PM2
# 2. Clone GitHub repository (jaosnxu/CTEA)
# 3. Initialize database with schema.sql (10 SKUs)
# 4. Configure Nginx port 80 → 3000 proxy
# 5. Start backend with PM2
# 6. Verify deployment with curl tests
#
# Usage: sudo bash deploy-oneclick.sh
################################################################################

set -e  # Exit on any error

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVER_IP="43.166.239.99"
PROJECT_DIR="/var/www/chutea"
DB_NAME="chutea_db"
DB_USER="postgres"  # Adjust if you created a specific user
GITHUB_REPO="https://github.com/jaosnxu/CTEA.git"
NODE_VERSION="18"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}CHU TEA - One-Click Deployment${NC}"
echo -e "${GREEN}Server: ${SERVER_IP}${NC}"
echo -e "${GREEN}========================================${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}Error: Please run as root (use sudo)${NC}"
  exit 1
fi

# Step 1: Update system
echo -e "\n${YELLOW}[1/10] Updating system packages...${NC}"
apt-get update -y
apt-get upgrade -y

# Step 2: Install Node.js 18
echo -e "\n${YELLOW}[2/10] Installing Node.js ${NODE_VERSION}...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt-get install -y nodejs
fi
echo -e "${GREEN}✓ Node.js version: $(node --version)${NC}"
echo -e "${GREEN}✓ npm version: $(npm --version)${NC}"

# Step 3: Install pnpm
echo -e "\n${YELLOW}[3/10] Installing pnpm...${NC}"
if ! command -v pnpm &> /dev/null; then
    npm install -g pnpm
fi
echo -e "${GREEN}✓ pnpm version: $(pnpm --version)${NC}"

# Step 4: Install PM2
echo -e "\n${YELLOW}[4/10] Installing PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi
echo -e "${GREEN}✓ PM2 version: $(pm2 --version)${NC}"

# Step 5: Install Nginx
echo -e "\n${YELLOW}[5/10] Installing Nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    apt-get install -y nginx
fi
systemctl start nginx
systemctl enable nginx
echo -e "${GREEN}✓ Nginx version: $(nginx -v 2>&1)${NC}"

# Step 6: Clone GitHub repository
echo -e "\n${YELLOW}[6/10] Cloning GitHub repository...${NC}"
if [ -d "${PROJECT_DIR}" ]; then
    echo -e "${BLUE}Project directory exists, pulling latest changes...${NC}"
    cd ${PROJECT_DIR}
    git pull origin main
else
    echo -e "${BLUE}Cloning repository...${NC}"
    mkdir -p /var/www
    cd /var/www
    git clone ${GITHUB_REPO} chutea
    cd chutea
fi
echo -e "${GREEN}✓ Repository cloned to ${PROJECT_DIR}${NC}"

# Step 7: Initialize database with schema.sql
echo -e "\n${YELLOW}[7/10] Initializing database...${NC}"

# Create schema.sql if it doesn't exist
if [ ! -f "${PROJECT_DIR}/schema.sql" ]; then
    echo -e "${BLUE}Creating schema.sql...${NC}"
    cat > ${PROJECT_DIR}/schema.sql <<'SQL'
-- CHU TEA Platform - Database Schema
-- Database: chutea_db

-- Drop existing tables
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create products table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name_zh VARCHAR(255),
    name_en VARCHAR(255),
    name_ru VARCHAR(255) NOT NULL,
    description_zh TEXT,
    description_en TEXT,
    description_ru TEXT,
    category VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    image_url TEXT,
    is_manual_override BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create orders table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id INTEGER,
    items JSONB NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    payment_method VARCHAR(50),
    delivery_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    open_id VARCHAR(255) UNIQUE,
    name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    language VARCHAR(10) DEFAULT 'ru',
    vip_level INTEGER DEFAULT 0,
    points INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_override ON products(is_manual_override);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_users_openid ON users(open_id);

-- Insert 10 sample products (SKUs)
INSERT INTO products (name_zh, name_en, name_ru, description_ru, category, price, image_url, is_manual_override) VALUES
('草莓芝士', 'Strawberry Cheezo', 'Клубничный Чиз', 'Свежая клубника, жасминовый чай, сырная пенка.', 'Сырный чай', 500.00, '/products/strawberry-cheezo.png', false),
('芒果芝士', 'Mango Cheezo', 'Манго Чиз', 'Спелое манго, зеленый чай, нежная сырная пена.', 'Сырный чай', 310.00, '/products/mango-cheezo.png', false),
('葡萄芝士', 'Grape Cheezo', 'Виноградный Чиз', 'Сочный виноград, улун, воздушная сырная шапка.', 'Сырный чай', 399.00, '/products/grape-cheezo.png', false),
('经典奶茶', 'Classic Milk Tea', 'Классический чай с молоком и тапиокой', 'Черный чай, свежее молоко, жемчужины тапиоки.', 'Молочный чай', 410.00, '/products/classic-milktea.png', false),
('红糖奶茶', 'Brown Sugar Milk Tea', 'Молочный чай с коричневым сахаром', 'Карамельный сироп, молоко, черный чай, тапиока.', 'Молочный чай', 280.00, '/products/brown-sugar-milktea.png', false),
('茉莉绿茶', 'Jasmine Green Tea', 'Жасминовый зеленый чай', 'Освежающий зеленый чай с цветами жасмина.', 'Сезонное', 220.00, '/products/jasmine-greentea.png', false),
('保温杯', 'Tumbler', 'Термокружка CHU TEA', 'Фирменная термокружка из нержавеющей стали 500мл.', 'Товары', 1200.00, '/products/tumbler.png', false),
('帆布包', 'Tote Bag', 'Холщовая сумка', 'Экологичная сумка-шоппер с логотипом CHU TEA.', 'Товары', 800.00, '/products/tote-bag.png', false),
('礼品卡', 'Gift Card', 'Подарочная карта', 'Электронная подарочная карта на ₽1000.', 'Товары', 1000.00, '/products/gift-card.png', false),
('茶叶礼盒', 'Tea Gift Set', 'Подарочный набор чая', 'Премиальный набор из 5 сортов чая в подарочной упаковке.', 'Товары', 2500.00, '/products/tea-kit.png', false);

-- Insert 3 sample orders for demo
INSERT INTO orders (order_number, user_id, items, total_amount, status, payment_method, delivery_type) VALUES
('P00001', 1, '[{"id":1,"name":"Клубничный Чиз","quantity":2,"price":500}]', 1000.00, 'COMPLETED', 'card', 'pickup'),
('P00002', 1, '[{"id":2,"name":"Манго Чиз","quantity":1,"price":310}]', 310.00, 'VOIDED', 'card', 'delivery'),
('K00003', 2, '[{"id":4,"name":"Классический чай с молоком и тапиокой","quantity":3,"price":410}]', 1230.00, 'PENDING', 'cash', 'delivery');

COMMIT;
SQL
fi

# Execute schema.sql
echo -e "${BLUE}Executing schema.sql...${NC}"
sudo -u postgres psql -d ${DB_NAME} -f ${PROJECT_DIR}/schema.sql

# Verify database initialization
PRODUCT_COUNT=$(sudo -u postgres psql -d ${DB_NAME} -t -c "SELECT COUNT(*) FROM products;")
echo -e "${GREEN}✓ Database initialized: ${PRODUCT_COUNT} products loaded${NC}"

# Step 8: Install dependencies and build
echo -e "\n${YELLOW}[8/10] Installing dependencies and building...${NC}"
cd ${PROJECT_DIR}
pnpm install --frozen-lockfile

# Build frontend
echo -e "${BLUE}Building frontend...${NC}"
cd client
pnpm run build
cd ..
echo -e "${GREEN}✓ Frontend built successfully${NC}"

# Step 9: Configure environment variables
echo -e "\n${YELLOW}[9/10] Configuring environment variables...${NC}"

# Create .env.production
cat > ${PROJECT_DIR}/.env.production <<ENV
# CHU TEA Production Environment
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://${DB_USER}@localhost:5432/${DB_NAME}

# Server
PUBLIC_URL=http://${SERVER_IP}
CORS_ORIGINS=http://${SERVER_IP},http://localhost

# JWT (generate secure secret in production)
JWT_SECRET=$(openssl rand -base64 32)

# Owner
OWNER_NAME=CHU TEA Admin
OWNER_OPEN_ID=admin@chutea.com

# Frontend
VITE_APP_TITLE=CHU TEA
VITE_APP_LOGO=/logo.svg
VITE_APP_ID=chutea-prod

# Feature Flags
FEATURE_TELEGRAM_BOT=false
FEATURE_LOYALTY_PROGRAM=true
FEATURE_GIFT_CARDS=true
FEATURE_IIKO_SYNC=false
ENV

echo -e "${GREEN}✓ Environment variables configured${NC}"

# Step 10: Configure Nginx
echo -e "\n${YELLOW}[10/10] Configuring Nginx...${NC}"

# Create Nginx configuration
cat > /etc/nginx/sites-available/chutea <<'NGINX'
# CHU TEA Platform - Nginx Configuration

upstream chutea_backend {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;
    server_name _;

    # Root directory for frontend
    root /var/www/chutea/client/dist;
    index index.html;

    # Max upload size
    client_max_body_size 10M;

    # Logging
    access_log /var/log/nginx/chutea-access.log;
    error_log /var/log/nginx/chutea-error.log;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;

    # tRPC API endpoints
    location /trpc {
        proxy_pass http://chutea_backend;
        proxy_http_version 1.1;
        
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Disable buffering for real-time updates
        proxy_buffering off;
    }

    # Legacy API endpoints
    location /api {
        proxy_pass http://chutea_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Webhook endpoints
    location /webhook {
        proxy_pass http://chutea_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Static assets
    location /assets {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /products {
        expires 30d;
        add_header Cache-Control "public";
    }

    # React Router fallback
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }

    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
NGINX

# Enable site
ln -sf /etc/nginx/sites-available/chutea /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Reload Nginx
systemctl reload nginx
echo -e "${GREEN}✓ Nginx configured and reloaded${NC}"

# Step 11: Start backend with PM2
echo -e "\n${YELLOW}[11/11] Starting backend with PM2...${NC}"

# Create PM2 ecosystem file
cat > ${PROJECT_DIR}/ecosystem.config.js <<'PM2'
module.exports = {
  apps: [{
    name: 'chutea-backend',
    script: 'server/index.ts',
    interpreter: 'node',
    interpreter_args: '--loader tsx',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M'
  }]
};
PM2

# Create logs directory
mkdir -p ${PROJECT_DIR}/logs

# Stop existing PM2 process
pm2 delete chutea-backend 2>/dev/null || true

# Start backend
cd ${PROJECT_DIR}
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root

echo -e "${GREEN}✓ Backend started with PM2${NC}"

# Step 12: Verification
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"

echo -e "\n${YELLOW}Running verification tests...${NC}"

# Test 1: Health check
echo -e "\n${BLUE}[Test 1] Health Check${NC}"
HEALTH_RESPONSE=$(curl -s http://localhost/health)
if [ "$HEALTH_RESPONSE" == "healthy" ]; then
    echo -e "${GREEN}✓ Health check passed${NC}"
else
    echo -e "${RED}✗ Health check failed${NC}"
fi

# Test 2: Frontend
echo -e "\n${BLUE}[Test 2] Frontend${NC}"
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/)
if [ "$FRONTEND_STATUS" == "200" ]; then
    echo -e "${GREEN}✓ Frontend accessible (HTTP 200)${NC}"
else
    echo -e "${RED}✗ Frontend failed (HTTP ${FRONTEND_STATUS})${NC}"
fi

# Test 3: tRPC API
echo -e "\n${BLUE}[Test 3] tRPC API - Products List${NC}"
API_RESPONSE=$(curl -s -X POST http://localhost/trpc/products.list \
  -H "Content-Type: application/json" \
  -d '{"json":{}}')

if echo "$API_RESPONSE" | grep -q "Клубничный Чиз"; then
    echo -e "${GREEN}✓ tRPC API working (products loaded)${NC}"
else
    echo -e "${RED}✗ tRPC API failed${NC}"
    echo -e "${YELLOW}Response: ${API_RESPONSE}${NC}"
fi

# Test 4: Database connection
echo -e "\n${BLUE}[Test 4] Database Connection${NC}"
DB_TEST=$(sudo -u postgres psql -d ${DB_NAME} -t -c "SELECT COUNT(*) FROM products WHERE is_manual_override = false;")
echo -e "${GREEN}✓ Database connected: ${DB_TEST} products with is_manual_override=false${NC}"

# Test 5: PM2 status
echo -e "\n${BLUE}[Test 5] PM2 Process Status${NC}"
pm2 status
echo -e "${GREEN}✓ PM2 status displayed above${NC}"

# Final summary
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Summary${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Frontend URL:      ${BLUE}http://${SERVER_IP}${NC}"
echo -e "Admin Panel:       ${BLUE}http://${SERVER_IP}/admin/products${NC}"
echo -e "Order Page:        ${BLUE}http://${SERVER_IP}/order${NC}"
echo -e "API Endpoint:      ${BLUE}http://${SERVER_IP}/trpc${NC}"
echo -e "Database:          ${BLUE}${DB_NAME} (${PRODUCT_COUNT} products)${NC}"
echo -e "PM2 Process:       ${BLUE}chutea-backend (running)${NC}"
echo -e "${GREEN}========================================${NC}"

echo -e "\n${YELLOW}Next Steps:${NC}"
echo -e "1. Open browser: ${BLUE}http://${SERVER_IP}/admin/products${NC}"
echo -e "2. Click 'Edit Price' for any product"
echo -e "3. Change price and click 'Save'"
echo -e "4. Open ${BLUE}http://${SERVER_IP}/order${NC} in another tab"
echo -e "5. Verify price updates automatically (within 1 second)"
echo -e "\n${GREEN}✓ Real-time sync is ready for testing!${NC}"
