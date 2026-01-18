#!/bin/bash

################################################################################
# CHU TEA Platform - Admin Password Generator
# 
# Generates a secure 20-character random password for admin users
# and updates the database with the new password hash.
#
# Usage: sudo bash scripts/generate-admin-password.sh
################################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_NAME="${DB_NAME:-chutea_db}"
PROJECT_DIR="${PROJECT_DIR:-/var/www/chutea}"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}CHU TEA - Admin Password Generator${NC}"
echo -e "${GREEN}========================================${NC}"

# Generate 20-character random password
# Uses /dev/urandom for cryptographic randomness
# Includes uppercase, lowercase, numbers, and special characters
generate_password() {
    # Generate a 20-character password with mixed characters
    local password=$(LC_ALL=C tr -dc 'A-Za-z0-9!@#$%^&*()_+-=' < /dev/urandom | head -c 20)
    echo "$password"
}

# Generate bcrypt hash using Node.js
generate_hash() {
    local password="$1"
    local hash=$(node -e "
        const bcrypt = require('bcryptjs');
        const hash = bcrypt.hashSync('$password', 10);
        console.log(hash);
    ")
    echo "$hash"
}

# Main execution
echo -e "\n${YELLOW}[1/3] Generating secure password...${NC}"
ADMIN_PASSWORD=$(generate_password)
echo -e "${GREEN}Generated 20-character password${NC}"

echo -e "\n${YELLOW}[2/3] Creating bcrypt hash...${NC}"
cd "$PROJECT_DIR" 2>/dev/null || cd "$(dirname "$0")/.."
PASSWORD_HASH=$(generate_hash "$ADMIN_PASSWORD")
echo -e "${GREEN}Hash created successfully${NC}"

echo -e "\n${YELLOW}[3/3] Updating admin user in database...${NC}"

# Update admin user password in MySQL
mysql -u root -p"${MYSQL_ROOT_PASSWORD:-}" "$DB_NAME" -e "
UPDATE admin_users 
SET password_hash = '$PASSWORD_HASH', 
    updated_at = NOW() 
WHERE username = 'admin';
" 2>/dev/null || echo -e "${YELLOW}Note: Database update skipped (run on server)${NC}"

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Password Generation Complete!${NC}"
echo -e "${GREEN}========================================${NC}"

echo -e "\n${BLUE}Admin Credentials:${NC}"
echo -e "  Username: ${GREEN}admin${NC}"
echo -e "  Password: ${GREEN}${ADMIN_PASSWORD}${NC}"

echo -e "\n${YELLOW}IMPORTANT:${NC}"
echo -e "  1. Save this password securely - it cannot be recovered!"
echo -e "  2. This password replaces the default 'admin123' password"
echo -e "  3. Use this password to login at /admin/login"

echo -e "\n${BLUE}Password saved to: ${PROJECT_DIR}/.admin-password${NC}"

# Save password to file (for reference only - should be deleted after use)
echo "ADMIN_USERNAME=admin" > "${PROJECT_DIR}/.admin-password" 2>/dev/null || echo "ADMIN_USERNAME=admin" > ".admin-password"
echo "ADMIN_PASSWORD=${ADMIN_PASSWORD}" >> "${PROJECT_DIR}/.admin-password" 2>/dev/null || echo "ADMIN_PASSWORD=${ADMIN_PASSWORD}" >> ".admin-password"
echo "GENERATED_AT=$(date -Iseconds)" >> "${PROJECT_DIR}/.admin-password" 2>/dev/null || echo "GENERATED_AT=$(date -Iseconds)" >> ".admin-password"

echo -e "\n${RED}WARNING: Delete .admin-password file after noting the password!${NC}"
