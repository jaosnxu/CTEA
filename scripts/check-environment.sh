#!/bin/bash

################################################################################
# CTEA Platform - Environment Self-Check Script
#
# This script validates the development environment before starting the project.
# Run this script before `pnpm run dev` to ensure compatibility.
#
# Usage: ./scripts/check-environment.sh
#
# Exit Codes:
#   0 - All checks passed
#   1 - Critical error (cannot proceed)
#   2 - Warning (can proceed with caution)
################################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
ERRORS=0
WARNINGS=0

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  CTEA Environment Self-Check${NC}"
echo -e "${BLUE}  M3.4-GLOBAL-COMP-002A Compliance${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# ==========================================
# Check 1: Node.js Version
# ==========================================
echo -e "${BLUE}[1/5] Checking Node.js version...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}  FAIL: Node.js is not installed${NC}"
    echo -e "${RED}        Please install Node.js v22 LTS${NC}"
    ERRORS=$((ERRORS + 1))
else
    NODE_VERSION=$(node --version | sed 's/v//')
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1)
    
    if [ "$NODE_MAJOR" -lt 22 ]; then
        echo -e "${RED}  FAIL: Node.js version $NODE_VERSION is too old${NC}"
        echo -e "${RED}        Required: v22.x (LTS)${NC}"
        echo -e "${YELLOW}        Run: nvm install 22 && nvm use 22${NC}"
        ERRORS=$((ERRORS + 1))
    elif [ "$NODE_MAJOR" -ge 24 ]; then
        echo -e "${RED}  FAIL: Node.js version $NODE_VERSION is not supported${NC}"
        echo -e "${RED}        Node.js v24+ has esbuild/Vite compatibility issues${NC}"
        echo -e "${YELLOW}        Run: nvm install 22 && nvm use 22${NC}"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}  PASS: Node.js v$NODE_VERSION${NC}"
    fi
fi

# ==========================================
# Check 2: pnpm Installation
# ==========================================
echo -e "${BLUE}[2/5] Checking pnpm installation...${NC}"

if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}  FAIL: pnpm is not installed${NC}"
    echo -e "${YELLOW}        Run: npm install -g pnpm${NC}"
    ERRORS=$((ERRORS + 1))
else
    PNPM_VERSION=$(pnpm --version)
    PNPM_MAJOR=$(echo $PNPM_VERSION | cut -d. -f1)
    
    if [ "$PNPM_MAJOR" -lt 10 ]; then
        echo -e "${YELLOW}  WARN: pnpm version $PNPM_VERSION is outdated${NC}"
        echo -e "${YELLOW}        Recommended: v10.4.1+${NC}"
        WARNINGS=$((WARNINGS + 1))
    else
        echo -e "${GREEN}  PASS: pnpm v$PNPM_VERSION${NC}"
    fi
fi

# ==========================================
# Check 3: Dependencies Installed
# ==========================================
echo -e "${BLUE}[3/5] Checking dependencies...${NC}"

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}  WARN: node_modules not found${NC}"
    echo -e "${YELLOW}        Run: pnpm install${NC}"
    WARNINGS=$((WARNINGS + 1))
else
    # Check for critical dependencies
    MISSING_DEPS=0
    
    if [ ! -d "node_modules/better-sqlite3" ]; then
        echo -e "${YELLOW}  WARN: better-sqlite3 not installed${NC}"
        MISSING_DEPS=$((MISSING_DEPS + 1))
    fi
    
    if [ ! -d "node_modules/@prisma/client" ]; then
        echo -e "${YELLOW}  WARN: @prisma/client not installed${NC}"
        MISSING_DEPS=$((MISSING_DEPS + 1))
    fi
    
    if [ $MISSING_DEPS -gt 0 ]; then
        echo -e "${YELLOW}        Run: pnpm install${NC}"
        WARNINGS=$((WARNINGS + 1))
    else
        echo -e "${GREEN}  PASS: Dependencies installed${NC}"
    fi
fi

# ==========================================
# Check 4: Environment Variables
# ==========================================
echo -e "${BLUE}[4/5] Checking environment configuration...${NC}"

if [ ! -f ".env" ]; then
    echo -e "${YELLOW}  WARN: .env file not found${NC}"
    echo -e "${YELLOW}        Copy from .env.production.template${NC}"
    WARNINGS=$((WARNINGS + 1))
else
    # Check for critical env vars
    MISSING_VARS=0
    
    if ! grep -q "DATABASE_URL" .env 2>/dev/null; then
        echo -e "${YELLOW}  WARN: DATABASE_URL not set in .env${NC}"
        MISSING_VARS=$((MISSING_VARS + 1))
    fi
    
    if [ $MISSING_VARS -gt 0 ]; then
        WARNINGS=$((WARNINGS + 1))
    else
        echo -e "${GREEN}  PASS: Environment configured${NC}"
    fi
fi

# ==========================================
# Check 5: Prisma Client
# ==========================================
echo -e "${BLUE}[5/5] Checking Prisma client...${NC}"

if [ ! -d "node_modules/.prisma/client" ]; then
    echo -e "${YELLOW}  WARN: Prisma client not generated${NC}"
    echo -e "${YELLOW}        Run: pnpm exec prisma generate${NC}"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}  PASS: Prisma client generated${NC}"
fi

# ==========================================
# Summary
# ==========================================
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Summary${NC}"
echo -e "${BLUE}========================================${NC}"

if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}  Errors:   $ERRORS (must fix before starting)${NC}"
fi

if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}  Warnings: $WARNINGS (recommended to fix)${NC}"
fi

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}  All checks passed!${NC}"
fi

echo ""

# Exit with appropriate code
if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}Environment check FAILED. Please fix errors before proceeding.${NC}"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}Environment check passed with warnings.${NC}"
    exit 0
else
    echo -e "${GREEN}Environment is ready for development!${NC}"
    exit 0
fi
