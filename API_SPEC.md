# CHU TEA Platform - API Specification

**Version:** 2.0  
**Date:** January 6, 2026  
**Status:** Pending Approval

---

## Overview

This document defines all tRPC API endpoints for the 8 advanced business features. All endpoints follow the existing tRPC architecture with type-safe request/response schemas.

---

## 1. Phone Verification & Registration APIs

### 1.1 `auth.sendVerificationCode`

**Purpose:** Send SMS verification code to phone number

**Type:** Public Mutation

**Request:**
```typescript
{
  phone: string;  // Format: +79001234567 (E.164 format)
  purpose: 'REGISTRATION' | 'LOGIN' | 'RESET_PASSWORD';
}
```

**Response:**
```typescript
{
  success: boolean;
  message: string;  // "Verification code sent" or error message
  expiresIn: number;  // Seconds until code expires (300 = 5 minutes)
}
```

**Business Logic:**
- Rate limiting: 1 code per phone per minute
- Code expires in 5 minutes
- Store code in `phone_verification` table
- Send SMS via external SMS provider (Twilio/Aliyun)

**Error Cases:**
- `TOO_MANY_REQUESTS`: Exceeded rate limit
- `INVALID_PHONE`: Phone format invalid

---

### 1.2 `auth.verifyPhoneAndRegister`

**Purpose:** Verify phone code and create/activate member (with signup bonus)

**Type:** Public Mutation

**Request:**
```typescript
{
  phone: string;
  code: string;  // 6-digit code
  name?: string;  // Optional: member name
}
```

**Response:**
```typescript
{
  success: boolean;
  member: {
    id: number;
    phone: string;
    name: string;
    total_points: number;  // Should be 100 for new members
    current_tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  };
  isNewMember: boolean;  // true if signup bonus was granted
  message: string;
}
```

**Business Logic:**
1. Verify code matches and not expired
2. Check if member exists by phone
3. If new member:
   - Create member record
   - Check idempotency key `signup_bonus:{phone}`
   - If not exists, grant 100 points and record idempotency key
4. Mark phone as verified (`phone_verified = true`, `phone_verified_at = NOW()`)
5. Return member info

**Error Cases:**
- `INVALID_CODE`: Code doesn't match or expired
- `CODE_ALREADY_USED`: Code already verified

---

## 2. Product Options & Real-time Pricing APIs

### 2.1 `products.getProductDetail`

**Purpose:** Get product detail page content (including options and defaults)

**Type:** Public Query

**Request:**
```typescript
{
  productId: number;
  storeId?: number;  // Optional: if provided, return store-specific price
}
```

**Response:**
```typescript
{
  id: number;
  name: { zh: string; en: string; ru: string };
  description: { zh: string; en: string; ru: string };
  basePrice: number;
  storePrice?: number;  // If storeId provided and price_override exists
  imageUrl: string;
  isSpecialPrice: boolean;
  
  // Default options (per-product)
  defaultOptions: {
    temperature: 'HOT' | 'WARM' | 'COLD' | 'ICED';
    iceLevel: 'NO_ICE' | 'LESS_ICE' | 'NORMAL_ICE' | 'EXTRA_ICE';
    sugarLevel: 'NO_SUGAR' | 'HALF_SUGAR' | 'NORMAL_SUGAR' | 'EXTRA_SUGAR';
  };
  
  // Available options
  options: {
    temperature: Array<{ id: number; name: { zh: string; en: string; ru: string }; priceAdjustment: number }>;
    iceLevel: Array<{ id: number; name: { zh: string; en: string; ru: string }; priceAdjustment: number }>;
    sugarLevel: Array<{ id: number; name: { zh: string; en: string; ru: string }; priceAdjustment: number }>;
    toppings: Array<{ id: number; name: { zh: string; en: string; ru: string }; priceAdjustment: number; isEnabled: boolean }>;
  };
  
  // Detail page content
  nutritionInfo: { calories: number; energy: number; protein: number; ... } | null;
  detailContent: { zh: string; en: string; ru: string };
  detailImages: string[];
  detailVideoUrl: string | null;
  
  // Reviews summary
  reviewStats: {
    averageRating: number;
    totalReviews: number;
    ratingDistribution: { 5: number; 4: number; 3: number; 2: number; 1: number };
  };
}
```

---

### 2.2 `products.calculatePrice`

**Purpose:** Calculate real-time price based on selected options (backend validation)

**Type:** Public Query

**Request:**
```typescript
{
  productId: number;
  storeId?: number;
  selectedOptions: {
    temperatureId: number;
    iceLevelId: number;
    sugarLevelId: number;
    toppingIds: number[];  // Array of topping IDs
  };
}
```

**Response:**
```typescript
{
  basePrice: number;
  optionsPrice: number;  // Sum of all price adjustments
  totalPrice: number;  // basePrice + optionsPrice
  breakdown: {
    base: { label: string; amount: number };
    options: Array<{ label: string; amount: number }>;
  };
}
```

**Business Logic:**
- Fetch product base price (or store override price)
- Fetch selected options and sum `price_adjustment` values
- Return detailed breakdown for frontend display

---

## 3. Product Reviews & Likes APIs

### 3.1 `reviews.getProductReviews`

**Purpose:** Get paginated reviews for a product

**Type:** Public Query

**Request:**
```typescript
{
  productId: number;
  page: number;  // Default: 1
  pageSize: number;  // Default: 10
  sortBy: 'RECENT' | 'RATING_HIGH' | 'RATING_LOW' | 'MOST_LIKED';
}
```

**Response:**
```typescript
{
  reviews: Array<{
    id: number;
    member: { id: number; name: string; avatar: string };
    rating: number;
    content: string;
    images: string[];
    likeCount: number;
    isPinned: boolean;
    isLikedByMe: boolean;  // If user is logged in
    reviewedAt: string;  // ISO timestamp
  }>;
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalReviews: number;
  };
}
```

**Business Logic:**
- Only return `status = APPROVED` reviews (unless admin)
- Pinned reviews appear first
- Check if current user liked each review

---

### 3.2 `reviews.createReview`

**Purpose:** Create a new product review (requires purchase verification)

**Type:** Protected Mutation

**Request:**
```typescript
{
  productId: number;
  orderId: number;  // Must be a completed order containing this product
  rating: number;  // 1-5
  content?: string;
  images?: string[];  // S3 URLs (uploaded separately)
}
```

**Response:**
```typescript
{
  success: boolean;
  review: {
    id: number;
    status: 'PENDING';  // New reviews require approval
    message: string;  // "Review submitted for approval"
  };
}
```

**Business Logic:**
- Verify `orderId` belongs to current user
- Verify order contains `productId`
- Verify order status is `COMPLETED`
- Create review with `status = PENDING`
- Notify admin for approval

**Error Cases:**
- `ORDER_NOT_FOUND`: Order doesn't exist or doesn't belong to user
- `PRODUCT_NOT_IN_ORDER`: Product not in specified order
- `ALREADY_REVIEWED`: User already reviewed this product for this order

---

### 3.3 `reviews.likeReview`

**Purpose:** Like or unlike a review

**Type:** Protected Mutation

**Request:**
```typescript
{
  reviewId: number;
  action: 'LIKE' | 'UNLIKE';
}
```

**Response:**
```typescript
{
  success: boolean;
  likeCount: number;  // Updated like count
}
```

**Business Logic:**
- If `LIKE`: Insert into `review_like` (ignore if already exists)
- If `UNLIKE`: Delete from `review_like`
- Update `product_review.like_count`

---

### 3.4 `reviews.approveReview` (Admin)

**Purpose:** Approve, reject, or hide a review

**Type:** Admin Mutation

**Request:**
```typescript
{
  reviewId: number;
  action: 'APPROVE' | 'REJECT' | 'HIDE' | 'PIN' | 'UNPIN';
  comment?: string;  // Admin comment (for rejection)
}
```

**Response:**
```typescript
{
  success: boolean;
  message: string;
}
```

---

## 4. Store-Product Configuration APIs

### 4.1 `stores.getStoreMenu`

**Purpose:** Get store-specific product menu

**Type:** Public Query

**Request:**
```typescript
{
  storeId: number;
  categoryId?: number;  // Optional: filter by category
}
```

**Response:**
```typescript
{
  store: {
    id: number;
    name: { zh: string; en: string; ru: string };
    address: { zh: string; en: string; ru: string };
  };
  products: Array<{
    id: number;
    name: { zh: string; en: string; ru: string };
    basePrice: number;
    storePrice: number;  // From store_product.price_override or product.base_price
    imageUrl: string;
    isSpecialPrice: boolean;
    stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  }>;
}
```

**Business Logic:**
- Join `product` with `store_product` where `store_id = {storeId}` and `is_enabled = true`
- Use `price_override` if exists, otherwise `base_price`

---

### 4.2 `stores.updateStoreProduct` (Admin)

**Purpose:** Configure product availability and pricing for a store

**Type:** Admin Mutation

**Request:**
```typescript
{
  storeId: number;
  productId: number;
  isEnabled: boolean;
  priceOverride?: number | null;  // null = use base price
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}
```

**Response:**
```typescript
{
  success: boolean;
  message: string;
}
```

---

## 5. Special Price Approval APIs

### 5.1 `specialPrice.createRequest`

**Purpose:** Create a special price approval request

**Type:** Protected Mutation (Store Manager or Admin)

**Request:**
```typescript
{
  requestType: 'PRODUCT' | 'STORE_PRODUCT';
  productId: number;
  storeId?: number;  // Required if requestType = STORE_PRODUCT
  specialPrice: number;
  startDate: string;  // ISO date: "2026-01-15"
  endDate: string;
  reason: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  request: {
    id: number;
    status: 'PENDING';
    message: string;  // "Special price request submitted for approval"
  };
}
```

**Business Logic:**
- Fetch current price (original_price)
- Create request with `status = PENDING`
- Notify configured approvers

---

### 5.2 `specialPrice.approveRequest` (Admin)

**Purpose:** Approve or reject a special price request

**Type:** Admin Mutation

**Request:**
```typescript
{
  requestId: number;
  action: 'APPROVE' | 'REJECT';
  comment?: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  message: string;
}
```

**Business Logic:**
- Update `status` to `APPROVED` or `REJECTED`
- Record `approver_id`, `approved_at`, `approval_comment`
- Log action in `special_price_audit_log`
- If approved and `start_date <= TODAY`, set `status = ACTIVE` and apply price

---

### 5.3 `specialPrice.getActiveSpecialPrices`

**Purpose:** Get all active special prices (for frontend display)

**Type:** Public Query

**Request:**
```typescript
{
  storeId?: number;  // Optional: filter by store
}
```

**Response:**
```typescript
{
  specialPrices: Array<{
    productId: number;
    productName: { zh: string; en: string; ru: string };
    originalPrice: number;
    specialPrice: number;
    storeId?: number;
    storeName?: { zh: string; en: string; ru: string };
    startDate: string;
    endDate: string;
  }>;
}
```

---

### 5.4 `specialPrice.runDailyTransition` (Cron Job)

**Purpose:** Auto-transition special price statuses based on dates

**Type:** Internal (Cron Job)

**Logic:**
- Find `APPROVED` requests where `start_date <= TODAY` → set to `ACTIVE`
- Find `ACTIVE` requests where `end_date < TODAY` → set to `ENDED`
- Log all transitions in audit log

---

## 6. Enhanced Coupon APIs

### 6.1 `coupons.getMyCoupons`

**Purpose:** Get user's available coupons with filtering

**Type:** Protected Query

**Request:**
```typescript
{
  status?: 'UNUSED' | 'USED' | 'EXPIRED' | 'FROZEN';
  tags?: string[];  // Filter by tags
}
```

**Response:**
```typescript
{
  coupons: Array<{
    id: number;
    template: {
      code: string;
      name: { zh: string; en: string; ru: string };
      discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
      discountValue: number;
      minOrderAmount: number;
    };
    status: 'UNUSED' | 'USED' | 'EXPIRED' | 'FROZEN';
    validUntil: string;  // Use adjusted_valid_until if exists, else original_valid_until
    sourceType: string;
    tags: string[];
    usedAt?: string;
  }>;
}
```

---

### 6.2 `coupons.validateCoupon`

**Purpose:** Validate if coupon can be used for an order (scope + mutual exclusion check)

**Type:** Protected Query

**Request:**
```typescript
{
  couponInstanceId: number;
  storeId: number;
  productIds: number[];
  orderAmount: number;
  usingPoints: boolean;  // If true, reject (mutual exclusion)
}
```

**Response:**
```typescript
{
  valid: boolean;
  reason?: string;  // If invalid, explain why
  discountAmount: number;  // Calculated discount if valid
}
```

**Business Logic:**
- Check `usingPoints` → if true, return `{ valid: false, reason: "Cannot use coupon with points" }`
- Check coupon status (must be `UNUSED`)
- Check expiration (use `adjusted_valid_until` if exists)
- Check scope (`ALL_STORES`, `STORES`, `PRODUCTS`, `CATEGORIES`)
- Check `min_order_amount`
- Calculate discount

---

### 6.3 `coupons.extendCouponExpiration` (Admin)

**Purpose:** Extend coupon expiration date

**Type:** Admin Mutation

**Request:**
```typescript
{
  couponInstanceId: number;
  newExpirationDate: string;  // ISO date
  reason: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  message: string;
}
```

**Business Logic:**
- Update `adjusted_valid_until`
- Log action in `coupon_audit_log`

---

### 6.4 `coupons.freezeCoupon` (Admin)

**Purpose:** Freeze or unfreeze a coupon

**Type:** Admin Mutation

**Request:**
```typescript
{
  couponInstanceId: number;
  action: 'FREEZE' | 'UNFREEZE';
  reason: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  message: string;
}
```

---

### 6.5 `coupons.getCouponAnalytics` (Admin)

**Purpose:** Get coupon usage analytics

**Type:** Admin Query

**Request:**
```typescript
{
  templateId?: number;  // Optional: filter by template
  sourceType?: string;  // Optional: filter by source
  startDate?: string;
  endDate?: string;
}
```

**Response:**
```typescript
{
  totalIssued: number;
  totalUsed: number;
  totalExpired: number;
  usageRate: number;  // Percentage
  totalDiscountAmount: number;
  totalGMV: number;  // Total order amount from coupon usage
  byStore: Array<{ storeId: number; storeName: string; usageCount: number; gmv: number }>;
  bySource: Array<{ sourceType: string; issuedCount: number; usedCount: number }>;
}
```

---

## 7. Influencer Campaign Code APIs

### 7.1 `campaigns.createCampaignCode`

**Purpose:** Generate unique code for influencer in a campaign

**Type:** Admin Mutation

**Request:**
```typescript
{
  campaignId: number;
  influencerId: number;
  codePrefix?: string;  // Optional: custom prefix (default: auto-generated)
}
```

**Response:**
```typescript
{
  success: boolean;
  code: {
    id: number;
    code: string;  // e.g., "A1234"
    campaignId: number;
    influencerId: number;
  };
}
```

**Business Logic:**
- Check if code already exists for this (campaign, influencer) pair
- Generate unique code: `{PREFIX}{RANDOM_4_DIGITS}`
- Ensure global uniqueness

---

### 7.2 `campaigns.scanOfflineCode`

**Purpose:** Record offline code scan (POS/cashier action)

**Type:** Protected Mutation (Cashier role)

**Request:**
```typescript
{
  code: string;  // Scanned code (e.g., "A1234")
  storeId: number;
  orderId?: number;  // Optional: if order already created
  orderAmount?: number;  // Optional: if order already created
}
```

**Response:**
```typescript
{
  success: boolean;
  campaign: {
    id: number;
    name: string;
    discountType: string;
    discountValue: number;
  };
  influencer: {
    id: number;
    name: string;
  };
  message: string;  // "Code scanned successfully"
}
```

**Business Logic:**
- Validate code exists and campaign is active
- Insert into `offline_scan_log` immediately (even if order is NULL)
- Return campaign/influencer info for cashier display
- If `orderId` provided, update `order.campaign_code_id`

**Error Cases:**
- `INVALID_CODE`: Code doesn't exist
- `CAMPAIGN_INACTIVE`: Campaign is not active

---

### 7.3 `campaigns.matchScanToOrder` (Background Job)

**Purpose:** Match unmatched scans to orders (for post-scan order creation)

**Type:** Internal (Background Job)

**Logic:**
- Find `offline_scan_log` where `matched = false` and `order_id IS NULL`
- For each scan, find orders in same store within ±5 minute time window
- If single match found and amount matches, update `order_id` and set `matched = true`
- If multiple matches or no match, leave unmatched for manual review

---

### 7.4 `campaigns.getInfluencerReport`

**Purpose:** Get performance report for an influencer

**Type:** Admin Query

**Request:**
```typescript
{
  influencerId: number;
  campaignId?: number;  // Optional: filter by campaign
  startDate?: string;
  endDate?: string;
}
```

**Response:**
```typescript
{
  influencer: { id: number; name: string };
  campaigns: Array<{
    campaignId: number;
    campaignName: string;
    code: string;
    scanCount: number;
    orderCount: number;
    matchedOrderCount: number;  // Orders successfully matched
    totalGMV: number;
    commission: number;  // Calculated based on influencer.commission_rate
  }>;
  totals: {
    totalScans: number;
    totalOrders: number;
    totalGMV: number;
    totalCommission: number;
  };
}
```

---

## 8. IIKO Sync Queue APIs

### 8.1 `iiko.queueProductSync`

**Purpose:** Queue a product sync job (manual trigger or auto-trigger)

**Type:** Admin Mutation

**Request:**
```typescript
{
  productIds: number[];  // Array of product IDs to sync
  direction: 'TO_IIKO' | 'FROM_IIKO';
}
```

**Response:**
```typescript
{
  success: boolean;
  jobIds: number[];  // Created job IDs
  message: string;
}
```

**Business Logic:**
- For each product, create a `iiko_sync_job` with `status = PENDING`
- Background worker will process jobs

---

### 8.2 `iiko.processSyncQueue` (Background Worker)

**Purpose:** Process pending IIKO sync jobs

**Type:** Internal (Background Worker)

**Logic:**
1. Fetch `PENDING` jobs ordered by `scheduled_at`
2. For each job:
   - Check if another `RUNNING` job exists for same `resource_type + resource_id` → skip (conflict protection)
   - Set status to `RUNNING`
   - Execute sync (call IIKO API)
   - If `direction = FROM_IIKO` and product has `is_manual_override = true` → log conflict and skip price update
   - On success: set status to `SUCCESS`, record response
   - On failure: increment `retry_count`, set status to `FAILED` or `PENDING` (if retries remain)
   - Log attempt in `iiko_sync_log`

---

### 8.3 `iiko.getSyncStatus`

**Purpose:** Get sync job status and logs

**Type:** Admin Query

**Request:**
```typescript
{
  jobId?: number;  // Optional: specific job
  resourceType?: string;  // Optional: filter by resource type
  status?: string;  // Optional: filter by status
  page: number;
  pageSize: number;
}
```

**Response:**
```typescript
{
  jobs: Array<{
    id: number;
    jobType: string;
    resourceType: string;
    resourceId: string;
    status: string;
    retryCount: number;
    errorMessage?: string;
    createdAt: string;
    completedAt?: string;
  }>;
  pagination: { page: number; pageSize: number; totalPages: number };
}
```

---

### 8.4 `iiko.retryFailedJob` (Admin)

**Purpose:** Manually retry a failed sync job

**Type:** Admin Mutation

**Request:**
```typescript
{
  jobId: number;
}
```

**Response:**
```typescript
{
  success: boolean;
  message: string;
}
```

**Business Logic:**
- Reset job status to `PENDING`
- Reset `retry_count` to 0 (manual retry doesn't count against max_retries)

---

## 9. Order APIs (Enhanced)

### 9.1 `orders.createOrder`

**Purpose:** Create order with points/coupon mutual exclusion validation

**Type:** Protected Mutation

**Request:**
```typescript
{
  storeId: number;
  items: Array<{
    productId: number;
    quantity: number;
    selectedOptions: {
      temperatureId: number;
      iceLevelId: number;
      sugarLevelId: number;
      toppingIds: number[];
    };
  }>;
  
  // Payment options (mutual exclusion)
  usePoints: boolean;
  couponInstanceId?: number;
  
  // Campaign code
  campaignCode?: string;  // Optional: if user scanned code in app
  
  deliveryAddress?: string;
  notes?: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  order: {
    id: number;
    orderNumber: string;
    subtotal: number;
    discountAmount: number;
    finalAmount: number;
    status: 'PENDING';
    paymentUrl?: string;  // If payment required
  };
}
```

**Business Logic:**
1. **Mutual Exclusion Validation:**
   - If `usePoints = true` AND `couponInstanceId != null` → reject with error "Cannot use points and coupon together"
2. **Points Calculation:**
   - If `usePoints = true`:
     - Calculate required points for full deduction
     - Check if user has enough points
     - If insufficient → reject with error "Insufficient points for full deduction"
3. **Special Price Check:**
   - Exclude special price items from points earning calculation
4. **Price Validation:**
   - Recalculate order total on backend
   - Validate against frontend-calculated total (prevent tampering)
5. **Campaign Code:**
   - If `campaignCode` provided, validate and link to order
6. **Create Order:**
   - Insert order with `status = PENDING`
   - Insert order items with option snapshots
   - If using coupon, mark coupon as `USED`
   - If using points, deduct points
7. **Payment:**
   - If `finalAmount > 0`, create payment hold (Tinkoff/YooKassa)
   - Return `paymentUrl` for redirect

**Error Cases:**
- `POINTS_COUPON_CONFLICT`: Both points and coupon selected
- `INSUFFICIENT_POINTS`: Not enough points for full deduction
- `INVALID_COUPON`: Coupon invalid or expired
- `PRICE_MISMATCH`: Frontend/backend price mismatch

---

### 9.2 `orders.calculateOrderTotal`

**Purpose:** Pre-calculate order total (before submission)

**Type:** Protected Query

**Request:**
```typescript
{
  storeId: number;
  items: Array<{
    productId: number;
    quantity: number;
    selectedOptions: {
      temperatureId: number;
      iceLevelId: number;
      sugarLevelId: number;
      toppingIds: number[];
    };
  }>;
  usePoints: boolean;
  couponInstanceId?: number;
}
```

**Response:**
```typescript
{
  subtotal: number;
  discountAmount: number;
  finalAmount: number;
  pointsRequired?: number;  // If usePoints = true
  pointsEarned: number;  // Points user will earn (excluding special price items)
  breakdown: {
    items: Array<{ productName: string; quantity: number; subtotal: number }>;
    discount: { type: string; amount: number };
  };
}
```

---

## 10. Admin Analytics APIs

### 10.1 `analytics.getDashboardStats`

**Purpose:** Get high-level dashboard statistics

**Type:** Admin Query

**Request:**
```typescript
{
  startDate?: string;
  endDate?: string;
  storeId?: number;  // Optional: filter by store
}
```

**Response:**
```typescript
{
  orders: {
    total: number;
    completed: number;
    cancelled: number;
    averageOrderValue: number;
  };
  revenue: {
    total: number;
    byPaymentMethod: Array<{ method: string; amount: number }>;
  };
  members: {
    total: number;
    newMembers: number;
    activeMembers: number;  // Members with orders in period
  };
  coupons: {
    issued: number;
    used: number;
    usageRate: number;
    totalDiscount: number;
  };
  campaigns: {
    totalScans: number;
    totalOrders: number;
    conversionRate: number;
  };
  topProducts: Array<{
    productId: number;
    productName: string;
    orderCount: number;
    revenue: number;
  }>;
}
```

---

## 11. Summary of API Endpoints

| Category | Endpoint | Type | Purpose |
|----------|----------|------|---------|
| **Auth** | `auth.sendVerificationCode` | Public Mutation | Send SMS code |
| | `auth.verifyPhoneAndRegister` | Public Mutation | Verify code + register |
| **Products** | `products.getProductDetail` | Public Query | Get product detail page |
| | `products.calculatePrice` | Public Query | Calculate real-time price |
| **Reviews** | `reviews.getProductReviews` | Public Query | Get paginated reviews |
| | `reviews.createReview` | Protected Mutation | Create review |
| | `reviews.likeReview` | Protected Mutation | Like/unlike review |
| | `reviews.approveReview` | Admin Mutation | Approve/reject/hide review |
| **Stores** | `stores.getStoreMenu` | Public Query | Get store-specific menu |
| | `stores.updateStoreProduct` | Admin Mutation | Configure store product |
| **Special Price** | `specialPrice.createRequest` | Protected Mutation | Create approval request |
| | `specialPrice.approveRequest` | Admin Mutation | Approve/reject request |
| | `specialPrice.getActiveSpecialPrices` | Public Query | Get active special prices |
| **Coupons** | `coupons.getMyCoupons` | Protected Query | Get user's coupons |
| | `coupons.validateCoupon` | Protected Query | Validate coupon for order |
| | `coupons.extendCouponExpiration` | Admin Mutation | Extend expiration |
| | `coupons.freezeCoupon` | Admin Mutation | Freeze/unfreeze coupon |
| | `coupons.getCouponAnalytics` | Admin Query | Get usage analytics |
| **Campaigns** | `campaigns.createCampaignCode` | Admin Mutation | Generate influencer code |
| | `campaigns.scanOfflineCode` | Protected Mutation | Record offline scan |
| | `campaigns.getInfluencerReport` | Admin Query | Get influencer performance |
| **IIKO** | `iiko.queueProductSync` | Admin Mutation | Queue sync job |
| | `iiko.getSyncStatus` | Admin Query | Get sync job status |
| | `iiko.retryFailedJob` | Admin Mutation | Retry failed job |
| **Orders** | `orders.createOrder` | Protected Mutation | Create order (with validation) |
| | `orders.calculateOrderTotal` | Protected Query | Pre-calculate total |
| **Analytics** | `analytics.getDashboardStats` | Admin Query | Get dashboard stats |

**Total Endpoints:** 28 (11 Public, 10 Protected, 7 Admin)

---

## 12. Authentication & Authorization

**Authentication:**
- Public endpoints: No authentication required
- Protected endpoints: Require valid JWT token (from phone verification or OAuth)
- Admin endpoints: Require JWT token + `role = 'admin'`

**Authorization Middleware:**
```typescript
// server/routers.ts
const publicProcedure = t.procedure;
const protectedProcedure = t.procedure.use(requireAuth);
const adminProcedure = t.procedure.use(requireAuth).use(requireAdmin);
```

---

## 13. Error Handling

**Standard Error Response:**
```typescript
{
  code: string;  // e.g., "INVALID_CODE", "INSUFFICIENT_POINTS"
  message: string;  // Human-readable error message
  details?: any;  // Optional: additional error context
}
```

**Common Error Codes:**
- `UNAUTHORIZED`: Not logged in
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Input validation failed
- `BUSINESS_LOGIC_ERROR`: Business rule violation (e.g., points/coupon conflict)
- `EXTERNAL_API_ERROR`: IIKO/Payment gateway error

---

## Next Steps

1. **Review & Approve** this API specification
2. **Implement Database Schema** (Drizzle ORM migrations)
3. **Implement tRPC Routers** (one router per feature module)
4. **Write Automated Tests** (Vitest unit tests for each endpoint)
5. **Update Frontend** (consume new APIs via tRPC client)

---

**Status:** ⏳ Awaiting Approval  
**Prepared By:** Manus AI Engineering Team  
**Date:** January 6, 2026
