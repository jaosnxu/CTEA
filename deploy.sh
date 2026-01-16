#!/bin/bash
#
# CHUTEA Platform - Automated Deployment Script
# 腾讯云轻量应用服务器 (Tencent Cloud Lighthouse) 部署脚本
#
# Usage: ./deploy.sh
#
# Prerequisites:
# - Node.js 22+
# - pnpm 10+
# - pm2 (global)
# - PostgreSQL (local or remote)
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  CHUTEA Platform Deployment Script${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Step 1: Pull latest code
echo -e "${YELLOW}[1/5] Pulling latest code from Git...${NC}"
git pull origin main
echo -e "${GREEN}Done.${NC}"
echo ""

# Step 2: Install dependencies
echo -e "${YELLOW}[2/5] Installing dependencies...${NC}"
pnpm install --frozen-lockfile
echo -e "${GREEN}Done.${NC}"
echo ""

# Step 3: Generate Prisma client
echo -e "${YELLOW}[3/5] Generating Prisma client...${NC}"
npx prisma generate
echo -e "${GREEN}Done.${NC}"
echo ""

# Step 4: Build the application
echo -e "${YELLOW}[4/5] Building application...${NC}"
pnpm run build
echo -e "${GREEN}Done.${NC}"
echo ""

# Step 5: Restart PM2 processes
echo -e "${YELLOW}[5/5] Restarting PM2 processes...${NC}"
if pm2 list | grep -q "chutea"; then
    pm2 restart chutea
else
    echo -e "${YELLOW}No existing PM2 process found. Starting new process...${NC}"
    pm2 start dist/index.js --name chutea
fi
pm2 save
echo -e "${GREEN}Done.${NC}"
echo ""

# Display status
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "PM2 Status:"
pm2 status
echo ""
echo -e "${YELLOW}Remember to:${NC}"
echo -e "  1. Fill in .env with real credentials"
echo -e "  2. Run 'npx prisma migrate deploy' if schema changed"
echo -e "  3. Open firewall port 5000 in Tencent Cloud console"
echo ""

# Generate deployment audit hash
COMMIT_HASH=$(git rev-parse HEAD)
AUDIT_HASH=$(echo -n "$COMMIT_HASH" | sha256sum | cut -d' ' -f1)
echo -e "${GREEN}Deployment Audit Hash:${NC}"
echo -e "  Commit: $COMMIT_HASH"
echo -e "  SHA256: $AUDIT_HASH"
