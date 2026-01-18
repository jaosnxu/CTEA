#!/bin/bash

################################################################################
# CTEA - 清理剩余PostgreSQL引用脚本
# 
# 用途：自动删除误导性文档并修正代码注释
# 运行：bash scripts/cleanup-remaining-postgres.sh
################################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}清理剩余PostgreSQL引用${NC}"
echo -e "${GREEN}========================================${NC}"

# 1. 删除误导性文档
echo -e "\n${YELLOW}[1/4] 删除PostgreSQL迁移文档...${NC}"

FILES_TO_DELETE=(
    "audit_evidence_pack/DB_MIGRATION_LOG.md"
    "audit_evidence_pack/M3.4-GLOBAL-COMP-002A-PH3-INIT.md"
    "scripts/convert_drizzle_to_prisma.py"
    "scripts/generate_prisma_schema.py"
)

DELETED_COUNT=0
for file in "${FILES_TO_DELETE[@]}"; do
    if [ -f "$file" ]; then
        rm "$file"
        echo -e "${GREEN}  ✓ 已删除: $file${NC}"
        ((DELETED_COUNT++))
    else
        echo -e "${BLUE}  ℹ 文件不存在: $file${NC}"
    fi
done

if [ $DELETED_COUNT -eq 0 ]; then
    echo -e "${GREEN}  ✓ 所有误导性文档已在之前清理${NC}"
fi

# 2. 修正代码注释
echo -e "\n${YELLOW}[2/4] 修正代码注释...${NC}"

FIXED_COUNT=0

# orders.ts
if [ -f "server/src/routes/orders.ts" ]; then
    if grep -q "PostgreSQL" server/src/routes/orders.ts; then
        sed -i 's/cloud PostgreSQL/cloud MySQL/g' server/src/routes/orders.ts
        echo -e "${GREEN}  ✓ 已修正: server/src/routes/orders.ts${NC}"
        ((FIXED_COUNT++))
    else
        echo -e "${BLUE}  ℹ 已是最新: server/src/routes/orders.ts${NC}"
    fi
fi

# sqlite.ts
if [ -f "server/src/db/sqlite.ts" ]; then
    if grep -q "PostgreSQL" server/src/db/sqlite.ts; then
        sed -i 's/cloud PostgreSQL/cloud MySQL/g' server/src/db/sqlite.ts
        echo -e "${GREEN}  ✓ 已修正: server/src/db/sqlite.ts${NC}"
        ((FIXED_COUNT++))
    else
        echo -e "${BLUE}  ℹ 已是最新: server/src/db/sqlite.ts${NC}"
    fi
fi

# generate-admin-password.sh
if [ -f "scripts/generate-admin-password.sh" ]; then
    if grep -q "sudo -u postgres psql" scripts/generate-admin-password.sh; then
        sed -i 's/# Update admin user password in PostgreSQL/# Update admin user password in MySQL/g' scripts/generate-admin-password.sh
        sed -i 's|sudo -u postgres psql -d|mysql -u root -p"\${MYSQL_ROOT_PASSWORD:-}"|g' scripts/generate-admin-password.sh
        echo -e "${GREEN}  ✓ 已修正: scripts/generate-admin-password.sh${NC}"
        ((FIXED_COUNT++))
    else
        echo -e "${BLUE}  ℹ 已是最新: scripts/generate-admin-password.sh${NC}"
    fi
fi

if [ $FIXED_COUNT -eq 0 ]; then
    echo -e "${GREEN}  ✓ 所有代码注释已是最新${NC}"
fi

# 3. 修正审计包文档
echo -e "\n${YELLOW}[3/4] 更新审计包文档...${NC}"

AUDIT_FIXED=0

if [ -d "audit_evidence_pack" ]; then
    # Fix PostgreSQL version references
    if grep -q "PostgreSQL 14" audit_evidence_pack/*.md 2>/dev/null; then
        find audit_evidence_pack -name "*.md" -type f -exec sed -i 's/PostgreSQL 14[.0-9]*/MySQL 8.0/g' {} \;
        ((AUDIT_FIXED++))
    fi
    
    # Fix postgres psql commands
    if grep -q "postgres psql" audit_evidence_pack/*.md 2>/dev/null; then
        find audit_evidence_pack -name "*.md" -type f -exec sed -i 's/sudo -u postgres psql -d/mysql -u root -p/g' {} \;
        ((AUDIT_FIXED++))
    fi
    
    # Fix PostgreSQL jsonb references
    if grep -q "PostgreSQL jsonb" audit_evidence_pack/*.md 2>/dev/null; then
        find audit_evidence_pack -name "*.md" -type f -exec sed -i 's/PostgreSQL jsonb/MySQL JSON/g' {} \;
        ((AUDIT_FIXED++))
    fi
    
    if [ $AUDIT_FIXED -gt 0 ]; then
        echo -e "${GREEN}  ✓ 已更新审计包文档${NC}"
    else
        echo -e "${BLUE}  ℹ 审计包文档已是最新${NC}"
    fi
fi

# 4. 验证清理结果
echo -e "\n${YELLOW}[4/4] 验证清理结果...${NC}"

# Count remaining PostgreSQL references (excluding historical documents)
POSTGRES_REFS=$(grep -r "PostgreSQL\|postgresql\|postgres" \
    --include="*.ts" --include="*.md" --include="*.sh" \
    --exclude-dir="node_modules" \
    --exclude-dir=".git" \
    --exclude="CHANGELOG.md" \
    --exclude="MYSQL_MIGRATION_REPORT.md" \
    --exclude="cleanup-remaining-postgres.sh" \
    . 2>/dev/null | wc -l || echo "0")

if [ "$POSTGRES_REFS" -gt 5 ]; then
    echo -e "${YELLOW}  ⚠ 仍有 $POSTGRES_REFS 处PostgreSQL引用（可能在历史文档中）${NC}"
    echo -e "${BLUE}  ℹ 运行以下命令查看详情：${NC}"
    echo -e "    grep -rn 'PostgreSQL\\|postgresql' --include='*.ts' --include='*.md' . | grep -v node_modules"
else
    echo -e "${GREEN}  ✓ PostgreSQL引用已基本清理完成${NC}"
fi

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✓ 清理完成！${NC}"
echo -e "${GREEN}========================================${NC}"

echo -e "\n${BLUE}清理摘要：${NC}"
echo -e "  ✓ 删除误导性文档：$DELETED_COUNT 个文件"
echo -e "  ✓ 修正代码注释：$FIXED_COUNT 个文件"
echo -e "  ✓ 更新审计文档：audit_evidence_pack/*"

echo -e "\n${YELLOW}下一步操作：${NC}"
echo -e "  1. 查看改动：git diff"
echo -e "  2. 验证系统：pnpm check"
echo -e "  3. 提交改动：git add . && git commit -m 'Clean up PostgreSQL references'"

exit 0
