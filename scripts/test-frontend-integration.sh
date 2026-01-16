#!/bin/bash

# Frontend Integration Test Script
# Tests frontend connection to backend API

echo "🧪 测试前端接入后端 API"
echo "================================"

BASE_URL="http://localhost:3000"
FRONTEND_URL="http://localhost:5173"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "\n${BLUE}Step 1:${NC} 检查后端服务"
echo "-----------------------------------"

if curl -s "$BASE_URL/api/health" > /dev/null 2>&1; then
  echo -e "${GREEN}✅ 后端服务运行中${NC}"
  health_response=$(curl -s "$BASE_URL/api/health")
  echo "Response: $(echo "$health_response" | jq -c '.' 2>/dev/null || echo "$health_response")"
else
  echo -e "${RED}❌ 后端服务未运行${NC}"
  echo "请先启动后端: pnpm dev"
  exit 1
fi

echo -e "\n${BLUE}Step 2:${NC} 检查产品 API"
echo "-----------------------------------"

products_response=$(curl -s "$BASE_URL/api/client/products")
products_count=$(echo "$products_response" | jq '.data | length' 2>/dev/null || echo "0")

if [ "$products_count" -gt 0 ]; then
  echo -e "${GREEN}✅ 产品 API 正常，共 $products_count 款产品${NC}"
  echo "Sample product: $(echo "$products_response" | jq -c '.data[0]' 2>/dev/null)"
else
  echo -e "${YELLOW}⚠️ 产品 API 返回 0 个产品${NC}"
  echo "建议运行: tsx scripts/seed-test-data.ts"
fi

echo -e "\n${BLUE}Step 3:${NC} 检查布局 API"
echo "-----------------------------------"

layout_response=$(curl -s "$BASE_URL/api/client/layouts/home")
if echo "$layout_response" | grep -q "success"; then
  echo -e "${GREEN}✅ 布局 API 正常${NC}"
  echo "Home layout sections: $(echo "$layout_response" | jq -c '.data.sections | length' 2>/dev/null || echo "N/A")"
else
  echo -e "${RED}❌ 布局 API 异常${NC}"
fi

echo -e "\n${BLUE}Step 4:${NC} 检查定价规则 API"
echo "-----------------------------------"

pricing_response=$(curl -s "$BASE_URL/api/admin/pricing-rules")
pricing_count=$(echo "$pricing_response" | jq '.data | length' 2>/dev/null || echo "0")

if [ "$pricing_count" -gt 0 ]; then
  echo -e "${GREEN}✅ 定价规则 API 正常，共 $pricing_count 条规则${NC}"
  echo "Rules: $(echo "$pricing_response" | jq -c '[.data[].name]' 2>/dev/null)"
else
  echo -e "${YELLOW}⚠️ 定价规则 API 返回 0 条规则 (使用默认规则)${NC}"
fi

echo -e "\n${BLUE}Step 5:${NC} 检查统计 API"
echo "-----------------------------------"

stats_response=$(curl -s "$BASE_URL/api/admin/products/stats/summary")
if echo "$stats_response" | grep -q "totalProducts"; then
  echo -e "${GREEN}✅ 统计 API 正常${NC}"
  echo "Stats: $(echo "$stats_response" | jq -c '.data' 2>/dev/null)"
else
  echo -e "${RED}❌ 统计 API 异常${NC}"
fi

echo -e "\n================================"
echo -e "${GREEN}✅ 后端 API 测试完成!${NC}"

echo -e "\n${BLUE}Step 6:${NC} 访问前端页面"
echo "-----------------------------------"
echo -e "${YELLOW}请手动测试前端:${NC}"
echo ""
echo "1. 启动前端开发服务器:"
echo "   cd client && pnpm dev"
echo ""
echo "2. 在浏览器中访问:"
echo "   ${BLUE}${FRONTEND_URL}/order${NC}"
echo ""
echo "3. 预期结果:"
echo "   - 页面显示产品列表"
echo "   - 顶部显示蓝色数据来源提示框"
echo "   - 浏览器控制台显示: '✅ [数据库] 已加载 N 款产品'"
echo ""
echo "4. 测试交互:"
echo "   - 搜索产品"
echo "   - 点击分类切换"
echo "   - 添加产品到购物车"
echo ""

echo -e "\n📝 故障排查:"
echo "-----------------------------------"
if [ "$products_count" -eq 0 ]; then
  echo "⚠️ 数据库中没有产品数据"
  echo "解决: tsx scripts/seed-test-data.ts"
  echo ""
fi

echo -e "${GREEN}✅ 集成测试脚本完成!${NC}"
