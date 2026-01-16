# Order Management System Documentation

## Overview

A comprehensive order management system has been implemented for the CTEA platform, providing full CRUD operations, status workflow management, and a user-friendly admin interface.

## Features

### 1. Database Schema

#### OrderStatus Enum
```prisma
enum OrderStatus {
  PENDING      // Initial state when order is created
  CONFIRMED    // Order confirmed by customer/staff
  PREPARING    // Order is being prepared
  READY        // Order ready for pickup/delivery
  DELIVERING   // Order is being delivered
  COMPLETED    // Order successfully completed
  CANCELLED    // Order cancelled
  REFUNDED     // Order refunded
}
```

#### Orders Model
Enhanced with the following fields:
- `status` - OrderStatus enum (default: PENDING)
- `totalAmount` - Total order amount
- `subtotalAmount` - Subtotal before discounts/fees
- `discountAmount` - Total discount applied
- `taxAmount` - Tax amount
- `deliveryFee` - Delivery fee
- `notes` - Order notes
- `deliveryAddress` - JSON field for delivery address
- `paymentMethod` - Payment method used
- `paymentStatus` - Payment status
- `deletedAt` - Soft delete timestamp (nullable)

#### OrderItems Model
Enhanced with:
- `productName` - Product name snapshot
- `productCode` - Product code snapshot
- `quantity` - Item quantity (default: 1)
- `unitPrice` - Price per unit
- `subtotal` - Item subtotal after discount
- `discountAmount` - Item discount amount
- `specifications` - JSON field for product specifications
- `notes` - Item-specific notes

### 2. Backend Services

#### Order Service (`server/src/services/order-service.ts`)

Provides comprehensive order management functionality:

##### Core Methods

**`list(filter: OrderListFilter)`**
- Lists orders with filtering and pagination
- Filters: storeId, userId, status, date range
- Supports soft-deleted order filtering
- Returns orders with related data (store, user, items)

**`detail(orderId: bigint | string | number)`**
- Gets complete order details
- Includes store, user, and order items
- Returns product information for each item

**`create(input: OrderCreateInput, operatorId?: string)`**
- Creates new order with items
- Validates items and calculates totals
- Generates order number automatically
- Transaction-safe operation

**`update(orderId, input: OrderUpdateInput, operatorId?: string)`**
- Updates order information
- Validates order exists and is not deleted
- Updates fields like notes, address, payment info

**`changeStatus(orderId, newStatus: OrderStatus, reason?: string, operatorId?: string)`**
- Changes order status with validation
- Validates status transitions
- Prevents invalid state changes
- Records status change reason

**`remove(orderId, operatorId?: string)`**
- Soft deletes order
- Sets `deletedAt` timestamp
- Prevents deletion of already deleted orders

**`getStatistics(filter)`**
- Returns order statistics
- Total count, status breakdown
- Revenue calculation

##### Status Transition Rules

The system enforces the following valid transitions:

```
PENDING → CONFIRMED, CANCELLED
CONFIRMED → PREPARING, CANCELLED
PREPARING → READY, CANCELLED
READY → DELIVERING, COMPLETED, CANCELLED
DELIVERING → COMPLETED, CANCELLED
COMPLETED → REFUNDED
CANCELLED → (terminal state)
REFUNDED → (terminal state)
```

### 3. Backend API

#### Admin Order Router (`server/src/trpc/routers/admin-order.router.ts`)

##### Endpoints

**`adminOrder.list`**
- Method: Query
- Input: `{ storeId?, userId?, status?, startDate?, endDate?, page?, pageSize?, includeDeleted? }`
- Returns: `{ orders: Order[], pagination: PaginationInfo }`
- RBAC: Store staff can only see their store's orders

**`adminOrder.getById`**
- Method: Query
- Input: `{ id: string | number | bigint }`
- Returns: `Order` with full details
- RBAC: Store staff can only access their store's orders

**`adminOrder.create`**
- Method: Mutation
- Input: `{ orderNumber?, storeId, userId?, status?, items[], deliveryAddress?, notes?, paymentMethod?, deliveryFee? }`
- Returns: Created `Order`
- Permission: `order:create`
- RBAC: Store staff can only create for their store
- Audit: Logs creation in audit log

**`adminOrder.update`**
- Method: Mutation
- Input: `{ id, status?, notes?, deliveryAddress?, paymentMethod?, paymentStatus? }`
- Returns: Updated `Order`
- Permission: `order:update`
- RBAC: Store staff can only update their store's orders
- Audit: Logs changes in audit log

**`adminOrder.changeStatus`**
- Method: Mutation
- Input: `{ id, status: OrderStatus, reason? }`
- Returns: `{ order, previousStatus, newStatus, reason }`
- Permission: `order:update`
- Validates: Status transitions
- Audit: Logs status change with reason

**`adminOrder.remove`**
- Method: Mutation
- Input: `{ id, reason? }`
- Returns: Deleted `Order`
- Permission: `order:delete`
- Audit: Logs deletion with reason

**`adminOrder.getStatistics`**
- Method: Query
- Input: `{ storeId?, startDate?, endDate? }`
- Returns: `{ total, byStatus[], revenue }`
- RBAC: Store staff only see their store's statistics

### 4. Frontend Utilities

#### Order Utilities (`client/src/lib/order-utils.ts`)

**`getOrderStatusLabel(status, locale)`**
- Returns localized status label
- Supports: en, ru, zh
- Example: `getOrderStatusLabel('PENDING', 'ru')` → "В ожидании"

**`getOrderStatusColor(status)`**
- Returns Tailwind CSS classes for status badge
- Color-coded by status category
- Example: `COMPLETED` → green, `CANCELLED` → red

**`getAvailableNextStatuses(currentStatus)`**
- Returns array of valid next statuses
- Used for status change dropdowns
- Enforces business rules

**`isOrderStatusFinal(status)`**
- Checks if status is terminal
- Returns `true` for COMPLETED, CANCELLED, REFUNDED

**Other utilities:**
- `formatOrderNumber()` - Formats order number for display
- `calculateItemSubtotal()` - Calculates item subtotal
- `calculateOrderTotal()` - Calculates order total

### 5. Admin UI Pages

#### Order List Page (`/admin/orders`)

**Features:**
- Comprehensive order table with columns:
  - Order number
  - Store name
  - Customer info
  - Item count
  - Total amount
  - Status badge (color-coded)
  - Creation date
  - Actions (view detail)

- **Statistics Dashboard:**
  - Total orders count
  - Total revenue
  - Completed orders count
  - Pending orders count

- **Filtering:**
  - Status dropdown
  - Store dropdown
  - Date range (start/end)
  - Reset filters button

- **Pagination:**
  - Configurable page size (default: 20)
  - Previous/Next navigation
  - Shows current page info

**Usage:**
```typescript
// Navigate to order list
<Link href="/admin/orders">Order Management</Link>

// Filter by status
setStatusFilter('CONFIRMED')

// Filter by date range
setStartDate('2024-01-01')
setEndDate('2024-12-31')
```

#### Order Detail Page (`/admin/orders/:id`)

**Features:**
- **Order Information Card:**
  - Order number
  - Store details
  - Total amount (prominent display)
  - Order notes

- **Customer Information Card:**
  - Customer name/nickname
  - Phone number
  - Delivery address
  - Payment method

- **Status Management:**
  - Current status badge
  - Status change dropdown (only valid transitions)
  - Reason textarea for status changes
  - Update button with loading state

- **Order Items Table:**
  - Product name and code
  - Quantity
  - Unit price
  - Discount amount
  - Subtotal
  - Complete breakdown of totals

- **Order Totals:**
  - Subtotal
  - Discount (if any)
  - Tax (if any)
  - Delivery fee (if any)
  - Total (highlighted)

**Usage:**
```typescript
// Navigate to order detail
<Link href={`/admin/orders/${orderId}`}>View Order</Link>

// Change order status
changeStatusMutation.mutate({
  id: orderId,
  status: 'CONFIRMED',
  reason: 'Customer confirmed by phone'
})
```

### 6. TypeScript Types

#### Client Types (`client/src/types/order.types.ts`)

Complete type definitions for frontend:
- `OrderStatus` - Status enum type
- `Order` - Complete order interface
- `OrderItem` - Order item interface
- `OrderStore` - Store information
- `OrderUser` - User information
- `OrderProduct` - Product information
- `OrderListResponse` - List API response
- `OrderStatistics` - Statistics response

### 7. Security & RBAC

#### Role-Based Access Control

**HQ Admin:**
- Can view/manage all orders across all stores
- Full access to create, update, delete operations

**Organization Admin:**
- Can view/manage orders in their organization's stores
- Full access within organization scope

**Store Manager/Staff:**
- Can only view/manage orders in their assigned store
- Cannot access other stores' orders
- Create/update limited to assigned store

#### Audit Logging

All order operations are logged:
- Order creation → `INSERT` action
- Order updates → `UPDATE` action with before/after data
- Status changes → `UPDATE` action with status transition
- Order deletion → `DELETE` action with reason

Each log includes:
- Operator ID and type
- IP address and user agent
- Timestamp
- Changes made (diff)

### 8. Integration

#### Routes Registration

Added to `server/routers.ts`:
```typescript
import { adminOrderRouter } from "./src/trpc/routers/admin-order.router";

export const appRouter = router({
  // ... existing routes
  adminOrder: adminOrderRouter,
});
```

Added to `client/src/App.tsx`:
```typescript
<Route path="/admin/orders/:id" component={AdminOrderDetail} />
<Route path="/admin/orders" component={AdminOrderList} />
```

#### Admin Menu

Updated `client/src/components/admin/AdminLayout.tsx`:
```typescript
{
  id: "ops-orders",
  label: { ru: "Заказы", zh: "订单监控" },
  icon: <ShoppingBag className="w-4 h-4" />,
  href: "/admin/orders",
}
```

### 9. Usage Examples

#### Creating an Order

```typescript
const mutation = trpc.adminOrder.create.useMutation();

mutation.mutate({
  storeId: 'store-123',
  userId: 'user-456',
  items: [
    {
      productId: 'prod-789',
      productName: 'Bubble Tea',
      quantity: 2,
      unitPrice: 150.00,
    }
  ],
  deliveryAddress: {
    street: 'Moscow Street 123',
    city: 'Moscow',
    zipCode: '101000'
  },
  paymentMethod: 'card',
  deliveryFee: 50.00
});
```

#### Changing Order Status

```typescript
const mutation = trpc.adminOrder.changeStatus.useMutation();

mutation.mutate({
  id: orderId,
  status: 'CONFIRMED',
  reason: 'Customer confirmed order via phone call'
});
```

#### Filtering Orders

```typescript
const { data } = trpc.adminOrder.list.useQuery({
  storeId: selectedStore,
  status: 'PENDING',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  page: 1,
  pageSize: 20
});
```

### 10. Best Practices

1. **Always validate status transitions** - Use `getAvailableNextStatuses()` before allowing status changes
2. **Provide reasons for status changes** - Especially for cancellations and refunds
3. **Use soft delete** - Never hard delete orders for audit trail
4. **Filter by date ranges** - For better performance on large datasets
5. **Check RBAC** - Ensure users can only access their authorized data
6. **Handle BigInt properly** - Convert to string for display, use BigInt for operations

### 11. Future Enhancements

Potential improvements for future development:

- **Order Timeline** - Visual timeline of status changes
- **Bulk Operations** - Batch status updates
- **Export Functionality** - Export orders to CSV/Excel
- **Advanced Search** - Full-text search across orders
- **Order Templates** - Quick order creation from templates
- **Notifications** - Email/SMS notifications for status changes
- **Integration with Payment Gateway** - Real-time payment status
- **Delivery Tracking** - GPS tracking for delivery orders
- **Customer Portal** - Allow customers to view their orders

### 12. Troubleshooting

**Q: Orders not showing up in list**
- Check RBAC permissions - store staff can only see their store's orders
- Verify filters - check if status/date filters are too restrictive
- Check `includeDeleted` parameter if looking for deleted orders

**Q: Cannot change order status**
- Verify status transition is valid - use `getAvailableNextStatuses()`
- Check permissions - ensure user has `order:update` permission
- Verify order is not deleted

**Q: Order totals not calculating correctly**
- Check item quantities and prices
- Verify discount amounts are positive
- Ensure delivery fee is included in total

**Q: Type errors in frontend**
- Import types from `@/types/order.types`
- Convert BigInt to string for display: `order.id.toString()`
- Check for undefined/null values before accessing nested properties

## Conclusion

The order management system provides a complete, type-safe, and secure solution for managing orders in the CTEA platform. It follows best practices for backend services, API design, and frontend development, with comprehensive RBAC and audit logging.
