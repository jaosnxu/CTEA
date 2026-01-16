# Pricing Rules Management System

## Overview

This document describes the pricing rules management system implemented for the CTEA platform. The system provides dynamic pricing capabilities with rule-based discounts, markups, and fixed pricing.

## Features

### Backend Features
- ✅ Database schema for pricing rules and product associations
- ✅ RESTful API endpoints for CRUD operations
- ✅ Rule-based pricing engine with priority system
- ✅ Support for multiple condition types (time, user level, quantity, etc.)
- ✅ Support for multiple action types (percentage discount, fixed discount, markup, fixed price)
- ✅ Product-rule association management
- ✅ Pagination, filtering, and sorting
- ✅ Soft delete for rules (isActive flag)

### Frontend Features
- ✅ Pricing rules list page with search and filters
- ✅ Rule creation and editing form
- ✅ Visual condition builder
- ✅ Action editor with type-based value input
- ✅ Multi-language support (Chinese, Russian, English)
- ✅ Integration with product editor
- ✅ Rule selection modal in product editor
- ✅ Form validation and error handling

## Database Schema

### `pricing_rules` Table

```sql
CREATE TABLE `pricing_rules` (
  `id` VARCHAR(50) PRIMARY KEY,
  `org_id` INT NOT NULL,
  `name` JSON NOT NULL,              -- Multi-language: {ru, zh, en}
  `description` JSON,                 -- Multi-language: {ru, zh, en}
  `condition` JSON NOT NULL,          -- Rule conditions
  `action` JSON NOT NULL,             -- Rule action
  `priority` INT NOT NULL DEFAULT 0,  -- Higher = applied first
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` INT,
  `updated_by` INT,
  INDEX `pricing_rule_org_idx` (`org_id`),
  INDEX `pricing_rule_active_idx` (`is_active`),
  INDEX `pricing_rule_priority_idx` (`priority`)
);
```

### `product_pricing_rules` Table (Junction)

```sql
CREATE TABLE `product_pricing_rules` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `product_id` INT NOT NULL,
  `rule_id` VARCHAR(50) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `ppr_product_idx` (`product_id`),
  INDEX `ppr_rule_idx` (`rule_id`),
  UNIQUE INDEX `ppr_unique_idx` (`product_id`, `rule_id`),
  FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`rule_id`) REFERENCES `pricing_rules` (`id`) ON DELETE CASCADE
);
```

## API Endpoints

### Pricing Rules API

#### GET /api/admin/pricing-rules
Get all pricing rules with pagination and filtering.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `perPage` (number): Results per page (default: 20, max: 100)
- `sortBy` (string): Sort field (default: "priority")
- `sortOrder` (string): "asc" or "desc" (default: "desc")
- `isActive` (boolean): Filter by active status
- `search` (string): Search in name/description

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "perPage": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

#### GET /api/admin/pricing-rules/:id
Get a single pricing rule by ID.

#### POST /api/admin/pricing-rules
Create a new pricing rule.

**Request Body:**
```json
{
  "name": {
    "zh": "欢乐时光",
    "ru": "Счастливые часы",
    "en": "Happy Hour"
  },
  "description": {
    "zh": "下午2-5点享8折",
    "ru": "20% скидка с 14:00 до 17:00",
    "en": "20% off from 2-5 PM"
  },
  "condition": {
    "hour": [14, 15, 16, 17]
  },
  "action": {
    "type": "DISCOUNT_PERCENT",
    "value": 20
  },
  "priority": 5,
  "isActive": true
}
```

#### PUT /api/admin/pricing-rules/:id
Update a pricing rule.

#### DELETE /api/admin/pricing-rules/:id
Soft delete a pricing rule (sets `isActive` to `false`).

#### GET /api/admin/pricing-rules/:id/products
Get list of product IDs affected by this rule.

### Products API Extensions

#### GET /api/admin/products/:id/pricing-rules
Get pricing rules associated with a product.

#### PUT /api/admin/products/:id/pricing-rules
Update pricing rules for a product.

**Request Body:**
```json
{
  "ruleIds": ["rule_001", "rule_002"]
}
```

## Condition Types

### Supported Conditions

| Condition | Type | Description | Example |
|-----------|------|-------------|---------|
| `userLevel` | string | User membership level | "Gold", "Silver", "Platinum" |
| `hour` | number[] | Hours of day (0-23) | [14, 15, 16, 17] |
| `dayOfWeek` | number[] | Days of week (0=Sun, 6=Sat) | [0, 6] |
| `storeId` | string | Specific store | "store_123" |
| `minQuantity` | number | Minimum order quantity | 2 |

### Condition Logic
- All conditions in a rule must be met (AND logic)
- If a condition field is not specified, it's not checked

## Action Types

| Action Type | Description | Value Meaning | Example |
|-------------|-------------|---------------|---------|
| `DISCOUNT_PERCENT` | Percentage discount | Discount % (e.g., 20 = 20% off) | `{"type": "DISCOUNT_PERCENT", "value": 20}` |
| `DISCOUNT_FIXED` | Fixed amount discount | Discount in rubles | `{"type": "DISCOUNT_FIXED", "value": 50}` |
| `MARKUP_PERCENT` | Percentage markup | Markup % (e.g., 10 = +10%) | `{"type": "MARKUP_PERCENT", "value": 10}` |
| `SET_PRICE` | Fixed price | Price in rubles | `{"type": "SET_PRICE", "value": 199}` |

## Priority System

- Rules are applied in priority order (highest to lowest)
- Higher priority number = applied first
- Multiple rules can be applied cumulatively
- Example:
  - Rule A (priority 10): 5% member discount
  - Rule B (priority 5): 20% happy hour discount
  - Both apply: 5% off first, then 20% off the result

## Frontend Pages

### /admin/pricing-rules
List view with:
- Search by name/description
- Filter by active/inactive status
- Pagination
- Edit and delete actions
- Create new rule button

### /admin/pricing-rules/new
Create new rule form with:
- Multi-language name and description inputs
- Condition builder (visual selector)
- Action editor (type + value)
- Priority number input
- Active/inactive toggle

### /admin/pricing-rules/edit/:id
Same as create, but pre-populated with existing rule data.

### Product Editor Integration
In the product editor's "Pricing Rules" tab:
- Display currently associated rules
- "Add Rule" button opens modal
- Modal shows all active rules
- Click to add/remove rules
- Saved with product data

## Internationalization

All user-facing text supports three languages:
- Russian (ru) - Primary language
- Chinese (zh)
- English (en)

Rule names and descriptions are stored as JSON objects with all three languages.

## Usage Examples

### Example 1: Happy Hour Discount
```json
{
  "name": {"zh": "欢乐时光", "ru": "Счастливые часы", "en": "Happy Hour"},
  "condition": {"hour": [14, 15, 16, 17]},
  "action": {"type": "DISCOUNT_PERCENT", "value": 20},
  "priority": 5
}
```

### Example 2: Weekend Special
```json
{
  "name": {"zh": "周末特价", "ru": "Выходные", "en": "Weekend Special"},
  "condition": {"dayOfWeek": [0, 6]},
  "action": {"type": "DISCOUNT_PERCENT", "value": 15},
  "priority": 3
}
```

### Example 3: Bulk Purchase Discount
```json
{
  "name": {"zh": "批量折扣", "ru": "Оптовая скидка", "en": "Bulk Discount"},
  "condition": {"minQuantity": 5},
  "action": {"type": "DISCOUNT_FIXED", "value": 100},
  "priority": 7
}
```

### Example 4: VIP Member Pricing
```json
{
  "name": {"zh": "VIP会员价", "ru": "VIP цена", "en": "VIP Price"},
  "condition": {"userLevel": "Platinum"},
  "action": {"type": "DISCOUNT_PERCENT", "value": 10},
  "priority": 10
}
```

## Testing

### Unit Tests
Located at: `server/src/engines/__tests__/pricing-engine.test.ts`

Run tests:
```bash
npm test
```

Test coverage includes:
- Rule fetching
- Price calculation
- Condition matching
- Priority ordering
- Action type handling

### Manual Testing Checklist

Backend:
- [ ] Create new pricing rule via API
- [ ] Update existing pricing rule
- [ ] Delete pricing rule (soft delete)
- [ ] List rules with pagination
- [ ] Filter rules by active status
- [ ] Search rules by name
- [ ] Associate rules with products
- [ ] Get products affected by a rule

Frontend:
- [ ] Navigate to pricing rules list
- [ ] Search for rules
- [ ] Filter by status
- [ ] Create new rule with all fields
- [ ] Edit existing rule
- [ ] Delete rule
- [ ] Add rules to product in editor
- [ ] Remove rules from product
- [ ] Save product with rules

## Future Enhancements

Potential improvements for future versions:

1. **Advanced Conditions**
   - Date range conditions
   - Order total conditions
   - Customer segment conditions
   - Location-based conditions

2. **Rule Testing**
   - Test rule against sample data
   - Preview price changes before applying
   - Simulation mode

3. **Analytics**
   - Track rule usage and effectiveness
   - Revenue impact analysis
   - A/B testing capabilities

4. **Rule Templates**
   - Pre-defined rule templates
   - Industry-specific templates
   - Quick setup wizards

5. **Scheduling**
   - Auto-enable/disable rules at specific times
   - Recurring schedule support
   - Campaign integration

6. **Conflict Resolution**
   - Better handling of overlapping rules
   - Rule exclusivity options
   - Maximum discount limits

## Troubleshooting

### Common Issues

**Issue: Rules not applying**
- Check if rule is active (`isActive = true`)
- Verify conditions match the test case
- Check priority order
- Ensure product has the rule associated

**Issue: Database not found**
- Run migration: `npm run db:push`
- Check DATABASE_URL environment variable
- Verify database connection

**Issue: UI not loading rules**
- Check API endpoint is accessible
- Verify CORS settings
- Check browser console for errors
- Ensure backend server is running

## Migration

To apply the database schema:

```bash
# Using the SQL migration file
mysql -u username -p database_name < drizzle/0002_add_pricing_rules.sql

# Or using Drizzle
npm run db:push
```

## Security Considerations

1. **Authorization**: Ensure only admin users can access pricing rule APIs
2. **Validation**: All inputs should be validated on both client and server
3. **SQL Injection**: Use parameterized queries (already handled by Drizzle)
4. **XSS**: Sanitize HTML in rule names/descriptions
5. **Rate Limiting**: Consider rate limiting on API endpoints

## Performance Considerations

1. **Indexing**: Ensure indexes on `org_id`, `is_active`, and `priority`
2. **Caching**: Consider caching active rules in memory
3. **Pagination**: Always use pagination for large rule sets
4. **Query Optimization**: Use selective queries to fetch only needed fields

## Support

For questions or issues, please refer to:
- GitHub Issues: [Project Repository]
- Documentation: This file
- API Tests: `server/src/engines/__tests__/pricing-engine.test.ts`
