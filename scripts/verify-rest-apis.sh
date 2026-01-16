#!/bin/bash

# REST API Verification Script
# Tests all REST endpoints to ensure they're working correctly

echo "🔍 验证 REST 接口..."
echo "================================"

BASE_URL="http://localhost:3000"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to test an endpoint
test_endpoint() {
  local name=$1
  local url=$2
  local expected_field=$3
  
  echo -e "\n${YELLOW}Testing:${NC} $name"
  echo "URL: $url"
  
  response=$(curl -s "$url" 2>&1)
  status=$?
  
  if [ $status -ne 0 ]; then
    echo -e "${RED}❌ 连接失败${NC}"
    return 1
  fi
  
  # Check if response contains expected field
  if echo "$response" | grep -q "$expected_field"; then
    echo -e "${GREEN}✅ 成功${NC}"
    echo "Response preview: $(echo "$response" | jq -c '. | {success, data: (.data | if type == "array" then length else "object" end)}' 2>/dev/null || echo "$response" | head -c 100)"
    return 0
  else
    echo -e "${RED}❌ 响应格式错误${NC}"
    echo "Response: $(echo "$response" | head -c 200)"
    return 1
  fi
}

echo -e "\n📋 Health Check"
test_endpoint "Health Check" "$BASE_URL/api/health" "status"

echo -e "\n📦 Client APIs"
test_endpoint "Get Products" "$BASE_URL/api/client/products" "success"
test_endpoint "Get Home Layout" "$BASE_URL/api/client/layouts/home" "success"
test_endpoint "Get Order Layout" "$BASE_URL/api/client/layouts/order" "success"
test_endpoint "Get Mall Layout" "$BASE_URL/api/client/layouts/mall" "success"

echo -e "\n🔧 Admin APIs"
test_endpoint "Get Admin Products" "$BASE_URL/api/admin/products" "success"
test_endpoint "Get Product Stats" "$BASE_URL/api/admin/products/stats/summary" "totalProducts"
test_endpoint "Get Pricing Rules" "$BASE_URL/api/admin/pricing-rules" "success"

echo -e "\n================================"
echo -e "${GREEN}✅ API 验证完成!${NC}"

# Count products
echo -e "\n📊 数据统计:"
product_count=$(curl -s "$BASE_URL/api/client/products" | jq '.data | length' 2>/dev/null || echo "N/A")
echo "  - 产品数量: $product_count"

pricing_rules_count=$(curl -s "$BASE_URL/api/admin/pricing-rules" | jq '.data | length' 2>/dev/null || echo "N/A")
echo "  - 定价规则: $pricing_rules_count"

echo -e "\n💡 提示: 如果有错误，请确保:"
echo "  1. 后端服务器正在运行 (pnpm dev)"
echo "  2. 数据库连接正常"
echo "  3. 测试数据已注入 (tsx scripts/seed-test-data.ts)"
