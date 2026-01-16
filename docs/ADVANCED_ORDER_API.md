# Advanced Order Management API Documentation

## Overview

This document describes the enhanced order management APIs that provide comprehensive features for modern e-commerce/ERP platforms.

## Table of Contents

1. [Advanced Search](#advanced-search)
2. [Order Export](#order-export)
3. [Batch Operations](#batch-operations)
4. [Order Lifecycle Logs](#order-lifecycle-logs)
5. [Payment Management](#payment-management)
6. [Refund Management](#refund-management)
7. [After-Sales Service](#after-sales-service)

---

## Advanced Search

### `enhancedOrder.advancedSearch`

Advanced multi-criteria order search with pagination and sorting.

**Endpoint:** `enhancedOrder.advancedSearch`

**Method:** `query`

**Input:**
```typescript
{
  // Search criteria
  orderNumber?: string;           // Partial order number search
  customerPhone?: string;         // Customer phone search
  customerName?: string;          // Customer name search
  storeId?: string;              // Filter by store
  status?: OrderStatus;          // Filter by order status
  paymentStatus?: string;        // Filter by payment status
  
  // Date range
  startDate?: string;            // ISO date string (YYYY-MM-DD)
  endDate?: string;              // ISO date string (YYYY-MM-DD)
  
  // Amount range
  minAmount?: number;            // Minimum order total
  maxAmount?: number;            // Maximum order total
  
  // Pagination
  page?: number;                 // Page number (default: 1)
  pageSize?: number;             // Items per page (default: 20, max: 100)
  
  // Sorting
  sortBy?: "createdAt" | "totalAmount" | "status";
  sortOrder?: "asc" | "desc";
}
```

**Output:**
```typescript
{
  orders: Order[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
```

**Example:**
```typescript
const result = await trpc.enhancedOrder.advancedSearch.query({
  customerPhone: "123456",
  status: "PENDING",
  startDate: "2024-01-01",
  endDate: "2024-12-31",
  page: 1,
  pageSize: 20,
  sortBy: "createdAt",
  sortOrder: "desc",
});
```

**Permissions Required:** `order:read`

---

## Order Export

### `enhancedOrder.exportCSV`

Export orders to CSV format.

**Endpoint:** `enhancedOrder.exportCSV`

**Method:** `mutation`

**Input:**
```typescript
{
  filters?: {
    storeId?: string;
    status?: OrderStatus;
    startDate?: string;        // ISO date string
    endDate?: string;          // ISO date string
  };
  orderIds?: string[];         // Specific order IDs to export
  fields?: string[];           // Custom fields to include (optional)
}
```

**Output:**
```typescript
{
  filename: string;            // Generated filename
  content: string;             // CSV content
  mimeType: string;           // "text/csv"
}
```

**Example:**
```typescript
const result = await trpc.enhancedOrder.exportCSV.mutate({
  filters: {
    storeId: "store-123",
    status: "COMPLETED",
    startDate: "2024-01-01",
    endDate: "2024-01-31",
  },
  fields: ["orderNumber", "status", "totalAmount", "createdAt"],
});

// Download file
const blob = new Blob([result.content], { type: result.mimeType });
const url = window.URL.createObjectURL(blob);
// ... trigger download
```

**Permissions Required:** `order:export`

### `enhancedOrder.exportExcel`

Export orders to Excel format (similar to CSV but with .xlsx extension).

**Endpoint:** `enhancedOrder.exportExcel`

**Method:** `mutation`

**Input:** Same as `exportCSV`

**Output:**
```typescript
{
  filename: string;
  content: string;             // TSV content (Excel-compatible)
  mimeType: string;           // "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
}
```

**Permissions Required:** `order:export`

---

## Batch Operations

### `enhancedOrder.batchUpdateStatus`

Update status of multiple orders in one operation.

**Endpoint:** `enhancedOrder.batchUpdateStatus`

**Method:** `mutation`

**Input:**
```typescript
{
  orderIds: string[];          // Array of order IDs (min: 1)
  newStatus: OrderStatus;      // Target status
  reason?: string;             // Optional reason for the change
}
```

**Output:**
```typescript
{
  successCount: number;        // Number of successfully updated orders
  failureCount: number;        // Number of failed updates
  errors: Array<{
    orderId: string;
    error: string;
  }>;
}
```

**Example:**
```typescript
const result = await trpc.enhancedOrder.batchUpdateStatus.mutate({
  orderIds: ["123", "456", "789"],
  newStatus: "CONFIRMED",
  reason: "Bulk confirmation after payment verification",
});

console.log(`Updated: ${result.successCount}, Failed: ${result.failureCount}`);
```

**Permissions Required:** `order:update`

**Notes:**
- Status transitions are validated per order
- Deleted orders are skipped
- Operation continues even if some orders fail
- Audit logs are created for each update

### `enhancedOrder.batchDelete`

Soft delete multiple orders.

**Endpoint:** `enhancedOrder.batchDelete`

**Method:** `mutation`

**Input:**
```typescript
{
  orderIds: string[];          // Array of order IDs (min: 1)
  reason?: string;             // Optional reason for deletion
}
```

**Output:**
```typescript
{
  successCount: number;
  failureCount: number;
  errors: Array<{
    orderId: string;
    error: string;
  }>;
}
```

**Permissions Required:** `order:delete`

---

## Order Lifecycle Logs

### `enhancedOrder.getOrderLogs`

Retrieve audit logs for an order showing all lifecycle events.

**Endpoint:** `enhancedOrder.getOrderLogs`

**Method:** `query`

**Input:**
```typescript
{
  orderId: string;
  page?: number;               // Default: 1
  pageSize?: number;           // Default: 50, max: 100
}
```

**Output:**
```typescript
{
  logs: Array<{
    id: bigint;
    orderId: bigint;
    action: string;            // CREATE, UPDATE, STATUS_CHANGE, etc.
    previousStatus?: string;
    newStatus?: string;
    operatorId?: string;
    operatorType?: string;     // CUSTOMER, STORE_STAFF, HQ_ADMIN, SYSTEM
    operatorName?: string;
    changes?: Json;            // Detailed change data
    notes?: string;
    ipAddress?: string;
    userAgent?: string;
    createdAt: DateTime;
  }>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
```

**Example:**
```typescript
const logs = await trpc.enhancedOrder.getOrderLogs.query({
  orderId: "123",
  page: 1,
  pageSize: 20,
});
```

**Permissions Required:** `order:read`

---

## Payment Management

### `enhancedOrder.payment.initiate`

Initiate a payment for an order.

**Endpoint:** `enhancedOrder.payment.initiate`

**Method:** `mutation`

**Input:**
```typescript
{
  orderId: string;
  paymentMethod: string;       // CARD, CASH, WALLET, QR_CODE
  paymentProvider?: string;    // STRIPE, ALIPAY, WECHAT, etc.
  amount: number;
  currency?: string;           // Default: "RUB"
  metadata?: Record<string, unknown>;
}
```

**Output:**
```typescript
{
  paymentId: bigint;
  status: string;              // "PENDING"
  message: string;
  // In production, would include:
  // redirectUrl?: string;
  // transactionId?: string;
  // qrCode?: string;
}
```

**Permissions Required:** `order:payment`

**Note:** This is a placeholder implementation. In production, this would integrate with actual payment gateways.

### `enhancedOrder.payment.updateStatus`

Update payment status (webhook callback).

**Endpoint:** `enhancedOrder.payment.updateStatus`

**Method:** `mutation`

**Input:**
```typescript
{
  paymentId: string;
  status: string;              // PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED
  transactionId?: string;
  paidAt?: string;             // ISO datetime
  failureReason?: string;
}
```

**Permissions Required:** `order:payment`

### `enhancedOrder.payment.getHistory`

Get payment history for an order.

**Endpoint:** `enhancedOrder.payment.getHistory`

**Method:** `query`

**Input:**
```typescript
{
  orderId: string;
}
```

**Output:**
```typescript
Array<{
  id: bigint;
  orderId: bigint;
  paymentMethod: string;
  paymentProvider?: string;
  transactionId?: string;
  amount: Decimal;
  currency: string;
  status: string;
  paidAt?: DateTime;
  failureReason?: string;
  metadata?: Json;
  createdAt: DateTime;
  updatedAt: DateTime;
}>
```

---

## Refund Management

### `enhancedOrder.refund.create`

Create a refund request.

**Endpoint:** `enhancedOrder.refund.create`

**Method:** `mutation`

**Input:**
```typescript
{
  orderId: string;
  paymentId?: string;
  refundAmount: number;
  refundReason: string;
  refundMethod?: string;       // ORIGINAL, WALLET, MANUAL
}
```

**Output:**
```typescript
{
  id: bigint;
  orderId: bigint;
  refundAmount: Decimal;
  refundReason: string;
  status: RefundStatus;        // PENDING
  createdAt: DateTime;
}
```

**Permissions Required:** `order:refund`

### `enhancedOrder.refund.approve`

Approve or reject a refund request.

**Endpoint:** `enhancedOrder.refund.approve`

**Method:** `mutation`

**Input:**
```typescript
{
  refundId: string;
  approved: boolean;
  rejectionReason?: string;
  notes?: string;
}
```

**Permissions Required:** `order:refund:approve`

### `enhancedOrder.refund.process`

Process an approved refund.

**Endpoint:** `enhancedOrder.refund.process`

**Method:** `mutation`

**Input:**
```typescript
{
  refundId: string;
  transactionId?: string;
  notes?: string;
}
```

**Permissions Required:** `order:refund:process`

### `enhancedOrder.refund.list`

List refund requests with filtering.

**Endpoint:** `enhancedOrder.refund.list`

**Method:** `query`

**Input:**
```typescript
{
  status?: RefundStatus;
  orderId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}
```

---

## After-Sales Service

### `enhancedOrder.afterSales.create`

Create an after-sales service request.

**Endpoint:** `enhancedOrder.afterSales.create`

**Method:** `mutation`

**Input:**
```typescript
{
  orderId: string;
  requestType: string;         // COMPLAINT, RETURN, EXCHANGE, QUALITY_ISSUE
  description: string;
  images?: string[];           // Image URLs
  priority?: Priority;         // LOW, MEDIUM, HIGH, URGENT
}
```

**Output:**
```typescript
{
  id: bigint;
  orderId: bigint;
  requestType: string;
  description: string;
  status: string;              // PENDING
  priority: Priority;
  createdAt: DateTime;
}
```

### `enhancedOrder.afterSales.update`

Update an after-sales request.

**Endpoint:** `enhancedOrder.afterSales.update`

**Method:** `mutation`

**Input:**
```typescript
{
  id: string;
  status?: string;             // PENDING, PROCESSING, RESOLVED, REJECTED, CLOSED
  assignedTo?: string;
  resolution?: string;
  notes?: string;
  customerSatisfaction?: number; // 1-5 rating
}
```

**Permissions Required:** `order:aftersales:update`

### `enhancedOrder.afterSales.list`

List after-sales requests.

**Endpoint:** `enhancedOrder.afterSales.list`

**Method:** `query`

**Input:**
```typescript
{
  orderId?: string;
  requestType?: string;
  status?: string;
  priority?: Priority;
  assignedTo?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}
```

### `enhancedOrder.afterSales.getStatistics`

Get statistics for after-sales requests.

**Endpoint:** `enhancedOrder.afterSales.getStatistics`

**Method:** `query`

**Input:**
```typescript
{
  startDate?: string;
  endDate?: string;
}
```

**Output:**
```typescript
{
  total: number;
  byStatus: Array<{
    status: string;
    count: number;
  }>;
  byType: Array<{
    type: string;
    count: number;
  }>;
  averageSatisfaction: number;
}
```

---

## Error Handling

All API endpoints follow consistent error handling:

```typescript
try {
  const result = await trpc.enhancedOrder.someMethod.query(input);
} catch (error) {
  if (error.data?.code === "UNAUTHORIZED") {
    // Handle unauthorized access
  } else if (error.data?.code === "FORBIDDEN") {
    // Handle permission denied
  } else if (error.data?.code === "NOT_FOUND") {
    // Handle resource not found
  } else if (error.data?.code === "BAD_REQUEST") {
    // Handle invalid input
  }
}
```

Common error codes:
- `UNAUTHORIZED`: User is not authenticated
- `FORBIDDEN`: User lacks required permissions
- `NOT_FOUND`: Resource does not exist
- `BAD_REQUEST`: Invalid input or business logic violation

---

## Rate Limiting

Export and batch operations may have rate limits:
- Export operations: 10 per hour per user
- Batch operations: 100 orders per request maximum

---

## Best Practices

1. **Use Advanced Search**: Leverage the advanced search API for complex filtering instead of fetching all orders
2. **Batch Operations**: Use batch operations for efficiency when updating multiple orders
3. **Error Handling**: Always handle partial failures in batch operations
4. **Pagination**: Use appropriate page sizes to balance performance and data freshness
5. **Audit Logs**: Review order lifecycle logs for debugging and compliance
6. **Snapshots**: Order snapshots preserve historical data even if related entities change

---

## Security

- All endpoints require authentication
- Role-based access control (RBAC) enforces permissions
- Sensitive operations (refund approval, batch delete) require elevated permissions
- Audit logs track all operations with operator details and IP addresses
- Payment integration uses placeholder implementation - integrate with PCI-compliant gateways in production

---

## Support

For questions or issues:
- Review the inline TypeScript types for detailed input/output schemas
- Check the audit logs for debugging order-related issues
- Contact the development team for API enhancements
