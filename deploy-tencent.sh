#!/bin/bash

################################################################################
# CHU TEA Platform - Tencent Cloud Deployment Script
# 
# This script automates the deployment process on Tencent Cloud CVM:
# 1. Install Node.js, MySQL, Nginx, PM2
# 2. Initialize MySQL database and tables
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

# Step 4: Install MySQL 8.0
echo -e "\n${YELLOW}[4/8] Installing MySQL 8.0...${NC}"
if ! command -v mysql &> /dev/null; then
    apt-get install -y mysql-server mysql-client
    systemctl start mysql
    systemctl enable mysql
fi
mysql --version

# Step 5: Initialize MySQL database
echo -e "\n${YELLOW}[5/8] Initializing MySQL database...${NC}"
mysql <<EOF
-- Create database
DROP DATABASE IF EXISTS ${DB_NAME};
CREATE DATABASE ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user
DROP USER IF EXISTS '${DB_USER}'@'localhost';
CREATE USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';

-- Grant privileges
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;

-- Use database
USE ${DB_NAME};

-- Note: Tables will be created by Prisma migrations
-- This is just a placeholder for manual table creation if needed

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
echo -e "   DATABASE_URL=mysql://${DB_USER}:${DB_PASSWORD}@localhost:3306/${DB_NAME}"
echo -e "2. Configure Nginx (see nginx-chutea.conf)"
echo -e "3. Obtain SSL certificate (certbot --nginx -d yourdomain.com)"
echo -e "4. Restart PM2: pm2 restart chutea-backend"
echo -e "\n${GREEN}✓ Deployment completed successfully!${NC}"
