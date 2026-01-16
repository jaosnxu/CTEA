# API Endpoints Documentation

## Overview

This document describes all newly implemented API endpoints for the CTEA platform.

## Base URL

```
Development: http://localhost:3000
Production: https://your-domain.com
```

---

## Admin API Endpoints

### 1. Get Product Statistics

Returns comprehensive statistics about products, orders, and revenue.

**Endpoint:** `GET /api/admin/products/stats/summary`

**Response:**

```json
{
  "success": true,
  "data": {
    "totalProducts": 150,
    "activeProducts": 142,
    "categories": 12,
    "orders": 1234,
    "totalRevenue": 45678.9
  },
  "timestamp": "2026-01-16T13:48:43.825Z"
}
```

---

### 2. List All Products (Admin)

Get a list of all products with optional filtering.

**Endpoint:** `GET /api/admin/products`

**Query Parameters:**

- `category` (optional) - Filter by category ID
- `search` (optional) - Search by product code
- `status` (optional) - Filter by status (ACTIVE/INACTIVE)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "orgId": 1,
      "categoryId": 5,
      "code": "PROD001",
      "name": { "ru": "Классический чай", "zh": "经典茶" },
      "basePrice": "299.00",
      "isActive": true,
      "createdAt": "2026-01-15T10:30:00.000Z",
      "updatedAt": "2026-01-15T10:30:00.000Z"
    }
  ],
  "count": 1,
  "timestamp": "2026-01-16T13:48:43.825Z"
}
```

---

### 3. Get Product Details (Admin)

Get detailed information about a specific product.

**Endpoint:** `GET /api/admin/products/:id`

**Parameters:**

- `id` - Product ID (integer)

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "orgId": 1,
    "categoryId": 5,
    "code": "PROD001",
    "name": { "ru": "Классический чай", "zh": "经典茶" },
    "description": { "ru": "Описание", "zh": "描述" },
    "basePrice": "299.00",
    "isActive": true,
    "sortOrder": 0,
    "createdAt": "2026-01-15T10:30:00.000Z",
    "updatedAt": "2026-01-15T10:30:00.000Z"
  },
  "timestamp": "2026-01-16T13:48:43.825Z"
}
```

---

### 4. Create Product

Create a new product.

**Endpoint:** `POST /api/admin/products`

**Request Body:**

```json
{
  "orgId": 1,
  "categoryId": 5,
  "code": "PROD002",
  "name": { "ru": "Новый чай", "zh": "新茶" },
  "basePrice": "350.00",
  "isActive": true
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 2,
    "orgId": 1,
    "categoryId": 5,
    "code": "PROD002",
    "name": { "ru": "Новый чай", "zh": "新茶" },
    "basePrice": "350.00",
    "isActive": true,
    "createdAt": "2026-01-16T13:48:43.825Z",
    "updatedAt": "2026-01-16T13:48:43.825Z"
  },
  "message": "Product created successfully",
  "timestamp": "2026-01-16T13:48:43.825Z"
}
```

---

### 5. Update Product

Update an existing product.

**Endpoint:** `PUT /api/admin/products/:id`

**Parameters:**

- `id` - Product ID (integer)

**Request Body:**

```json
{
  "name": { "ru": "Обновленный чай", "zh": "更新茶" },
  "basePrice": "399.00",
  "isActive": true
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": { "ru": "Обновленный чай", "zh": "更新茶" },
    "basePrice": "399.00",
    "updatedAt": "2026-01-16T13:50:00.000Z"
  },
  "message": "Product updated successfully",
  "timestamp": "2026-01-16T13:50:00.000Z"
}
```

---

### 6. Delete Product (Soft Delete)

Soft delete a product by setting isActive to false.

**Endpoint:** `DELETE /api/admin/products/:id`

**Parameters:**

- `id` - Product ID (integer)

**Response:**

```json
{
  "success": true,
  "message": "Product deleted successfully",
  "timestamp": "2026-01-16T13:51:00.000Z"
}
```

---

### 7. Get Pricing Rules

Get all pricing rules with optional filtering.

**Endpoint:** `GET /api/admin/pricing-rules`

**Query Parameters:**

- `productId` (optional) - Filter by product ID
- `isActive` (optional) - Filter by active status (true/false)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "rule_001",
      "name": "欢乐时光",
      "description": "下午2-5点享8折",
      "condition": {
        "hour": [14, 15, 16, 17]
      },
      "action": {
        "type": "DISCOUNT_PERCENT",
        "value": 20
      },
      "priority": 5,
      "isActive": true
    },
    {
      "id": "rule_002",
      "name": "会员折扣 - 金卡",
      "description": "金卡会员享95折",
      "condition": {
        "userLevel": "Gold"
      },
      "action": {
        "type": "DISCOUNT_PERCENT",
        "value": 5
      },
      "priority": 10,
      "isActive": true
    }
  ],
  "timestamp": "2026-01-16T13:48:43.825Z"
}
```

---

## Client API Endpoints

### 8. List Active Products (Client)

Get a list of all active products visible to clients.

**Endpoint:** `GET /api/client/products`

**Query Parameters:**

- `category` (optional) - Filter by category ID
- `search` (optional) - Search by product code

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": { "ru": "Классический чай", "zh": "经典茶" },
      "basePrice": "299.00",
      "isActive": true
    }
  ],
  "count": 1,
  "timestamp": "2026-01-16T13:48:43.825Z"
}
```

---

### 9. Get Product Details (Client)

Get detailed information about a specific product (client view).

**Endpoint:** `GET /api/client/products/:id`

**Parameters:**

- `id` - Product ID (integer)

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": { "ru": "Классический чай", "zh": "经典茶" },
    "description": { "ru": "Описание", "zh": "描述" },
    "basePrice": "299.00",
    "image": "/products/tea-001.jpg",
    "isActive": true
  },
  "timestamp": "2026-01-16T13:48:43.825Z"
}
```

---

### 10. Calculate Product Price

Calculate the final price for a product based on pricing rules.

**Endpoint:** `POST /api/client/products/:id/calculate-price`

**Parameters:**

- `id` - Product ID (integer)

**Request Body:**

```json
{
  "userId": "user_123",
  "storeId": "store_001",
  "quantity": 2,
  "timestamp": "2026-01-16T15:00:00.000Z"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "productId": "1",
    "productName": { "ru": "Классический чай", "zh": "经典茶" },
    "originalPrice": 299.0,
    "finalPrice": 239.2,
    "savedAmount": 59.8,
    "appliedRules": [
      {
        "ruleId": "rule_001",
        "ruleName": "欢乐时光",
        "adjustmentType": "DISCOUNT_PERCENT",
        "adjustmentValue": -59.8
      }
    ]
  },
  "timestamp": "2026-01-16T15:00:00.000Z"
}
```

---

### 11. Get Page Layout

Get the SDUI layout configuration for a specific page.

**Endpoint:** `GET /api/client/layouts/:pageName`

**Parameters:**

- `pageName` - Page identifier (home, order, mall)

**Response for Home Page:**

```json
{
  "success": true,
  "data": {
    "page": "home",
    "sections": [
      {
        "type": "banner",
        "imageUrl": "/banners/home.jpg",
        "autoPlay": true,
        "interval": 3000
      },
      {
        "type": "categories",
        "columns": 4,
        "showIcon": true
      },
      {
        "type": "hotProducts",
        "title": "Популярное",
        "limit": 6,
        "algorithm": "sales_rank"
      },
      {
        "type": "memberCard"
      },
      {
        "type": "couponSection",
        "limit": 3
      }
    ]
  },
  "timestamp": "2026-01-16T13:48:43.825Z"
}
```

**Response for Order Page:**

```json
{
  "success": true,
  "data": {
    "page": "order",
    "sections": [
      {
        "type": "categoryTabs"
      },
      {
        "type": "productGrid",
        "columns": 2
      },
      {
        "type": "floatingCart"
      }
    ]
  },
  "timestamp": "2026-01-16T13:48:43.825Z"
}
```

**Response for Mall Page:**

```json
{
  "success": true,
  "data": {
    "page": "mall",
    "sections": [
      {
        "type": "banner",
        "imageUrl": "/banners/mall.jpg"
      },
      {
        "type": "productGrid",
        "columns": 2,
        "showFilters": true
      }
    ]
  },
  "timestamp": "2026-01-16T13:48:43.825Z"
}
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Failed to fetch products",
  "error": "Database connection error"
}
```

**Common HTTP Status Codes:**

- `200` - Success
- `404` - Resource not found
- `500` - Internal server error

---

## Notes

1. **Authentication**: All admin endpoints should be protected with authentication (not implemented in this PR).
2. **Graceful Degradation**: Pricing rules and layouts return default values when database is unavailable.
3. **Timestamps**: All responses include an ISO 8601 timestamp.
4. **Success Flag**: All responses include a `success` boolean field.
