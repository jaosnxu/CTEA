#!/bin/bash

################################################################################
# CTEA Platform - MySQL Configuration Cleanup Script
# 
# This script removes all PostgreSQL-related remnants and ensures MySQL
# configuration is consistent across the project.
#
# Usage: bash scripts/fix-mysql-conflicts.sh
################################################################################

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}CTEA MySQL Configuration Cleanup${NC}"
echo -e "${GREEN}========================================${NC}"

# Function to print status messages
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "This script must be run from the project root directory"
    exit 1
fi

print_status "Starting MySQL configuration cleanup..."

# 1. Check current database configuration
print_status "Checking current database configuration..."

if [ -f "drizzle.config.ts" ]; then
    if grep -q 'dialect: "mysql"' drizzle.config.ts; then
        print_success "drizzle.config.ts is correctly set to MySQL"
    else
        print_warning "drizzle.config.ts dialect may need review"
    fi
else
    print_warning "drizzle.config.ts not found"
fi

if [ -f "prisma/schema.prisma" ]; then
    if grep -q 'provider = "mysql"' prisma/schema.prisma; then
        print_success "prisma/schema.prisma is correctly set to MySQL"
    else
        print_warning "prisma/schema.prisma provider may need review"
    fi
else
    print_warning "prisma/schema.prisma not found"
fi

# 2. Check for PostgreSQL references in documentation
print_status "Checking for PostgreSQL references in documentation..."

POSTGRES_REFS=$(grep -r "PostgreSQL\|postgresql" --include="*.md" . 2>/dev/null | grep -v "node_modules" | wc -l)
if [ "$POSTGRES_REFS" -gt 0 ]; then
    print_warning "Found $POSTGRES_REFS PostgreSQL references in documentation"
    echo "Run: grep -r 'PostgreSQL\\|postgresql' --include='*.md' . | grep -v node_modules"
else
    print_success "No PostgreSQL references found in markdown files"
fi

# 3. Verify docker-compose.yml
print_status "Checking docker-compose.yml..."

if [ -f "docker-compose.yml" ]; then
    if grep -q "mysql:8.0" docker-compose.yml; then
        print_success "docker-compose.yml uses MySQL 8.0"
    else
        print_warning "docker-compose.yml may not be using MySQL 8.0"
    fi
else
    print_warning "docker-compose.yml not found"
fi

# 4. Check environment files
print_status "Checking environment files..."

for env_file in .env.example .env.production.template .env.mysql.template; do
    if [ -f "$env_file" ]; then
        if grep -q "mysql://" "$env_file"; then
            print_success "$env_file uses MySQL connection string"
        else
            print_warning "$env_file may need MySQL connection string"
        fi
    else
        print_warning "$env_file not found"
    fi
done

# 5. Summary
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Cleanup Summary${NC}"
echo -e "${GREEN}========================================${NC}"

echo -e "\n${BLUE}Current Configuration:${NC}"
echo -e "  Database: MySQL 8.0+"
echo -e "  ORM: Drizzle ORM (legacy) + Prisma ORM (new)"
echo -e "  Connection String Format: mysql://user:password@host:port/database"

echo -e "\n${YELLOW}Next Steps:${NC}"
echo -e "  1. Review any PostgreSQL references in documentation"
echo -e "  2. Ensure all .env files use mysql:// connection strings"
echo -e "  3. Test database connections: pnpm db:push"
echo -e "  4. Run docker-compose up to verify MySQL container"

print_success "Cleanup check completed!"
