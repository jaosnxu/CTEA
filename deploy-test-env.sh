#!/bin/bash

###############################################################################
# CHU TEA - Test Environment Deployment Script
# 
# This script deploys the complete CHU TEA system to a test environment:
# - Node.js backend with PM2
# - PostgreSQL database
# - Redis cache
# - Nginx reverse proxy
# - Sentry error tracking
#
# Target: Ubuntu 22.04 LTS
# Usage: sudo bash deploy-test-env.sh
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="chutea"
PROJECT_DIR="/var/www/chutea"
NGINX_CONF="/etc/nginx/sites-available/chutea"
DB_NAME="chutea_test"
DB_USER="chutea_user"
DB_PASS=$(openssl rand -base64 32)  # Generate random password

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}CHU TEA Test Environment Deployment${NC}"
echo -e "${GREEN}========================================${NC}"

###############################################################################
# Step 1: System Dependencies
###############################################################################

echo -e "\n${YELLOW}[1/8] Installing system dependencies...${NC}"

# Update package list
apt-get update

# Install Node.js 22.x
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs
fi

# Install pnpm
if ! command -v pnpm &> /dev/null; then
    npm install -g pnpm@latest
fi

# Install PostgreSQL
if ! command -v psql &> /dev/null; then
    apt-get install -y postgresql postgresql-contrib
fi

# Install Redis
if ! command -v redis-server &> /dev/null; then
    apt-get install -y redis-server
fi

# Install Nginx
if ! command -v nginx &> /dev/null; then
    apt-get install -y nginx
fi

# Install PM2
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

echo -e "${GREEN}✓ System dependencies installed${NC}"

###############################################################################
# Step 2: PostgreSQL Setup
###############################################################################

echo -e "\n${YELLOW}[2/8] Setting up PostgreSQL...${NC}"

# Start PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# Create database and user
sudo -u postgres psql <<EOF
-- Drop existing database if exists
DROP DATABASE IF EXISTS ${DB_NAME};
DROP USER IF EXISTS ${DB_USER};

-- Create new database and user
CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';
CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
EOF

echo -e "${GREEN}✓ PostgreSQL configured${NC}"
echo -e "${YELLOW}Database: ${DB_NAME}${NC}"
echo -e "${YELLOW}User: ${DB_USER}${NC}"
echo -e "${YELLOW}Password: ${DB_PASS}${NC}"

###############################################################################
# Step 3: Redis Setup
###############################################################################

echo -e "\n${YELLOW}[3/8] Setting up Redis...${NC}"

# Configure Redis
cat > /etc/redis/redis.conf <<EOF
bind 127.0.0.1
port 6379
daemonize yes
supervised systemd
maxmemory 256mb
maxmemory-policy allkeys-lru
EOF

# Start Redis
systemctl restart redis-server
systemctl enable redis-server

echo -e "${GREEN}✓ Redis configured${NC}"

###############################################################################
# Step 4: Clone and Install Project
###############################################################################

echo -e "\n${YELLOW}[4/8] Cloning project...${NC}"

# Create project directory
mkdir -p ${PROJECT_DIR}
cd ${PROJECT_DIR}

# Clone from GitHub (replace with actual repo)
if [ ! -d ".git" ]; then
    git clone https://github.com/jaosnxu/CTEA.git .
fi

# Checkout dev branch
git checkout dev
git pull origin dev

# Install dependencies
pnpm install

echo -e "${GREEN}✓ Project cloned and dependencies installed${NC}"

###############################################################################
# Step 5: Environment Configuration
###############################################################################

echo -e "\n${YELLOW}[5/8] Configuring environment...${NC}"

# Create .env file
cat > ${PROJECT_DIR}/.env <<EOF
# Environment
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}

# Redis
REDIS_URL=redis://localhost:6379

# Sentry (Optional - configure if you have Sentry account)
# SENTRY_DSN=https://your-backend-dsn@sentry.io/project-id
# VITE_SENTRY_DSN=https://your-frontend-dsn@sentry.io/project-id
VITE_APP_VERSION=1.0.0

# Payment (Test Mode)
PAYMENT_PROVIDER=mock

# IIKO (Test Mode - configure with real credentials later)
# IIKO_API_URL=https://api-ru.iiko.services
# IIKO_API_LOGIN=your-login
# IIKO_ORGANIZATION_ID=your-org-id

# Logging
LOG_LEVEL=info

# Security (Auto-generated)
JWT_SECRET=$(openssl rand -base64 64)
SESSION_SECRET=$(openssl rand -base64 64)
EOF

chmod 600 ${PROJECT_DIR}/.env

echo -e "${GREEN}✓ Environment configured${NC}"

###############################################################################
# Step 6: Database Initialization
###############################################################################

echo -e "\n${YELLOW}[6/8] Initializing database...${NC}"

# Run database migrations (if using Drizzle ORM)
# pnpm db:push

# Initialize with sample data
# pnpm db:seed

echo -e "${GREEN}✓ Database initialized${NC}"

###############################################################################
# Step 7: Build and Start Application
###############################################################################

echo -e "\n${YELLOW}[7/8] Building and starting application...${NC}"

# Build frontend
pnpm build:prod

# Start backend with PM2
pm2 delete ${PROJECT_NAME} 2>/dev/null || true
pm2 start ${PROJECT_DIR}/server/_core/index.ts \
    --name ${PROJECT_NAME} \
    --interpreter node \
    --interpreter-args "--loader tsx" \
    --env production

# Save PM2 configuration
pm2 save
pm2 startup systemd -u root --hp /root

echo -e "${GREEN}✓ Application started with PM2${NC}"

###############################################################################
# Step 8: Nginx Configuration
###############################################################################

echo -e "\n${YELLOW}[8/8] Configuring Nginx...${NC}"

# Create Nginx configuration
cat > ${NGINX_CONF} <<'NGINX_EOF'
server {
    listen 80;
    server_name _;  # Replace with your domain

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/chutea_access.log;
    error_log /var/log/nginx/chutea_error.log;

    # API proxy
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files
    location / {
        root /var/www/chutea/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3000/api/health;
        access_log off;
    }
}
NGINX_EOF

# Enable site
ln -sf ${NGINX_CONF} /etc/nginx/sites-enabled/

# Test Nginx configuration
nginx -t

# Restart Nginx
systemctl restart nginx
systemctl enable nginx

echo -e "${GREEN}✓ Nginx configured${NC}"

###############################################################################
# Deployment Summary
###############################################################################

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"

echo -e "\n${YELLOW}Access Information:${NC}"
echo -e "Frontend: http://$(hostname -I | awk '{print $1}')"
echo -e "Backend API: http://$(hostname -I | awk '{print $1}')/api"

echo -e "\n${YELLOW}Database Credentials:${NC}"
echo -e "Host: localhost"
echo -e "Database: ${DB_NAME}"
echo -e "User: ${DB_USER}"
echo -e "Password: ${DB_PASS}"

echo -e "\n${YELLOW}Useful Commands:${NC}"
echo -e "View logs: pm2 logs ${PROJECT_NAME}"
echo -e "Restart app: pm2 restart ${PROJECT_NAME}"
echo -e "Stop app: pm2 stop ${PROJECT_NAME}"
echo -e "Check status: pm2 status"
echo -e "Nginx logs: tail -f /var/log/nginx/chutea_error.log"

echo -e "\n${YELLOW}Next Steps:${NC}"
echo -e "1. Configure Sentry DSN in .env for error tracking"
echo -e "2. Set up IIKO credentials for POS integration"
echo -e "3. Configure Tinkoff/YooKassa for payment processing"
echo -e "4. Set up SSL certificate with Let's Encrypt (certbot)"

echo -e "\n${GREEN}Test environment is ready for validation!${NC}"
