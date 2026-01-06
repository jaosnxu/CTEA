# CHU TEA - Service Layer

This directory contains business logic services that are decoupled from HTTP/tRPC routing.

## Architecture Principle

```
Controller/Router → Service → Data Access → Database
```

**Benefits:**
- Business logic is reusable across different interfaces (HTTP, GraphQL, CLI, etc.)
- Easier to test (services can be tested without HTTP layer)
- Clear separation of concerns
- Supports multi-tenant architecture

## Service Organization

### Current Services

| Service | File | Responsibility |
|---------|------|----------------|
| Product Service | `product.service.ts` | Product CRUD, pricing, inventory |
| Order Service | `order.service.ts` | Order creation, status management, prefix generation |
| Payment Service | `payment.service.ts` | Payment gateway integration, pre-auth logic |
| IIKO Service | `iiko.service.ts` | IIKO API integration, sync logic |
| Membership Service | `membership.service.ts` | Points, coupons, VIP tiers |
| Delivery Service | `delivery.service.ts` | Address management, zone calculation |
| Marketing Service | `marketing.service.ts` | Campaign management, promotion engine |
| Analytics Service | `analytics.service.ts` | Data aggregation, reporting |

### Future Services (Multi-tenant)

| Service | Responsibility |
|---------|----------------|
| Tenant Service | Tenant management, isolation |
| Franchise Service | Franchisee management, revenue sharing |
| Staff Service | Employee management, permissions |

## Service Pattern

Each service should follow this structure:

```typescript
// product.service.ts
export class ProductService {
  constructor(
    private db: Database,
    private logger: Logger
  ) {}

  async getProducts(tenantId?: string) {
    // Business logic here
  }

  async updatePrice(productId: string, price: number, userId: string) {
    // Validate
    // Update database
    // Log action
    // Return result
  }
}

export const productService = new ProductService(db, logger);
```

## Multi-tenant Considerations

All services should be designed with multi-tenancy in mind:

1. **Tenant Isolation**: All queries should filter by `tenant_id`
2. **Data Ownership**: Track which tenant owns which data
3. **Configuration**: Support tenant-specific settings
4. **Billing**: Track resource usage per tenant

Example:

```typescript
async getProducts(tenantId: string) {
  return this.db.products.findMany({
    where: { tenant_id: tenantId }
  });
}
```

## Testing

Services should be unit-testable without HTTP layer:

```typescript
import { productService } from './product.service';

test('should update product price', async () => {
  const result = await productService.updatePrice('prod-1', 500, 'admin-1');
  expect(result.price).toBe(500);
  expect(result.is_manual_override).toBe(true);
});
```

## Migration Path

Current code is being gradually refactored to use services:

1. ✅ Extract business logic from routers
2. ⏳ Create service classes
3. ⏳ Update routers to call services
4. ⏳ Add unit tests for services
5. ⏳ Add multi-tenant support
