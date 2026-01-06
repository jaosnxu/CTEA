#!/bin/bash

################################################################################
# CHU TEA Platform - Tencent Cloud Deployment Script
# 
# This script automates the deployment process on Tencent Cloud CVM:
# 1. Install Node.js, PostgreSQL, Nginx, PM2
# 2. Initialize PostgreSQL database and tables
# 3. Install project dependencies
# 4. Build frontend assets
# 5. Start backend server with PM2
# 6. Configure Nginx reverse proxy
#
# Usage: sudo bash deploy-tencent.sh
################################################################################

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="chutea"
PROJECT_DIR="/var/www/chutea"
DB_NAME="chutea_prod"
DB_USER="chutea_admin"
DB_PASSWORD="$(openssl rand -base64 32)"  # Generate secure random password
NODE_VERSION="22"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}CHU TEA Platform - Tencent Cloud Deployment${NC}"
echo -e "${GREEN}========================================${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}Error: Please run as root (use sudo)${NC}"
  exit 1
fi

# Step 1: Update system packages
echo -e "\n${YELLOW}[1/8] Updating system packages...${NC}"
apt-get update -y
apt-get upgrade -y

# Step 2: Install Node.js 22
echo -e "\n${YELLOW}[2/8] Installing Node.js ${NODE_VERSION}...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt-get install -y nodejs
fi
node --version
npm --version

# Step 3: Install pnpm
echo -e "\n${YELLOW}[3/8] Installing pnpm...${NC}"
if ! command -v pnpm &> /dev/null; then
    npm install -g pnpm
fi
pnpm --version

# Step 4: Install PostgreSQL
echo -e "\n${YELLOW}[4/8] Installing PostgreSQL...${NC}"
if ! command -v psql &> /dev/null; then
    apt-get install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
fi
psql --version

# Step 5: Initialize PostgreSQL database
echo -e "\n${YELLOW}[5/8] Initializing PostgreSQL database...${NC}"
sudo -u postgres psql <<EOF
-- Create database
DROP DATABASE IF EXISTS ${DB_NAME};
CREATE DATABASE ${DB_NAME};

-- Create user
DROP USER IF EXISTS ${DB_USER};
CREATE USER ${DB_USER} WITH ENCRYPTED PASSWORD '${DB_PASSWORD}';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};

-- Connect to database and create tables
\c ${DB_NAME}

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO ${DB_USER};

-- Create products table
CREATE TABLE IF NOT EXISTS products (
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
CREATE TABLE IF NOT EXISTS orders (
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
CREATE TABLE IF NOT EXISTS users (
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

-- Grant table privileges
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${DB_USER};
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${DB_USER};

EOF

echo -e "${GREEN}✓ Database ${DB_NAME} created successfully${NC}"
echo -e "${GREEN}✓ User ${DB_USER} created with password: ${DB_PASSWORD}${NC}"
echo -e "${YELLOW}⚠️  IMPORTANT: Save this password securely!${NC}"

# Step 6: Create project directory
echo -e "\n${YELLOW}[6/8] Setting up project directory...${NC}"
mkdir -p ${PROJECT_DIR}
cd ${PROJECT_DIR}

# If project files don't exist, clone from GitHub
if [ ! -f "package.json" ]; then
    echo -e "${YELLOW}Cloning project from GitHub...${NC}"
    echo -e "${RED}Please manually copy your project files to ${PROJECT_DIR}${NC}"
    echo -e "${RED}Or run: git clone https://github.com/jaosnxu/CTEA.git ${PROJECT_DIR}${NC}"
    exit 1
fi

# Step 7: Install dependencies and build
echo -e "\n${YELLOW}[7/8] Installing dependencies and building...${NC}"
pnpm install --frozen-lockfile

# Build frontend
echo -e "${YELLOW}Building frontend assets...${NC}"
cd client
pnpm run build
cd ..

# Step 8: Install PM2 and start server
echo -e "\n${YELLOW}[8/8] Starting server with PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

# Create PM2 ecosystem file
cat > ecosystem.config.js <<'PM2EOF'
module.exports = {
  apps: [{
    name: 'chutea-backend',
    script: 'server/index.ts',
    interpreter: 'node',
    interpreter_args: '--loader tsx',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
PM2EOF

# Create logs directory
mkdir -p logs

# Stop existing PM2 process if any
pm2 delete chutea-backend 2>/dev/null || true

# Start server with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Summary${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Database Name:     ${DB_NAME}"
echo -e "Database User:     ${DB_USER}"
echo -e "Database Password: ${DB_PASSWORD}"
echo -e "Project Directory: ${PROJECT_DIR}"
echo -e "PM2 Status:        $(pm2 list | grep chutea-backend)"
echo -e "${GREEN}========================================${NC}"

echo -e "\n${YELLOW}Next Steps:${NC}"
echo -e "1. Create .env.production file with DATABASE_URL"
echo -e "   DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}"
echo -e "2. Configure Nginx (see nginx-chutea.conf)"
echo -e "3. Obtain SSL certificate (certbot --nginx -d yourdomain.com)"
echo -e "4. Restart PM2: pm2 restart chutea-backend"
echo -e "\n${GREEN}✓ Deployment completed successfully!${NC}"
