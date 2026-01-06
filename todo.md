
- [x] Migrate frontend from fetch to tRPC for real-time data sync
- [x] Add is_manual_override field to products schema
- [ ] Implement admin-only access control for /admin routes (deferred - auth needed)
- [x] Update AdminProducts.tsx to use tRPC mutation
- [x] Update Order.tsx to use tRPC query with auto-revalidation
- [x] Update Orders.tsx to use tRPC query
- [x] Update Mall.tsx to use tRPC query
- [ ] Add adminProcedure to protect admin routes (deferred - auth needed)

## Final Assembly - Security & IIKO Sync Protection

- [x] Create adminProcedure in tRPC for role-based access control
- [x] Add auth middleware to protect /admin routes
- [x] Implement login redirect for unauthorized admin access (AdminRoute component)
- [x] Create IIKO sync simulator endpoint
- [x] Add override protection logic in sync handler
- [x] Test manual override prevents IIKO overwrite
- [x] Execute full security demo (login -> edit -> sync -> verify)
- [x] Generate final deployment report

## Roadshow Optimization

- [x] Generate 10 high-quality CHU TEA product images using AI
- [x] Update db_mock.ts with new product images and Russian descriptions
- [x] Add size/sugar/ice level variants to all products
- [x] Create 3 preset demo orders (COMPLETED, VOIDED, PENDING)
- [x] Generate 1-page executive summary (English + Russian)

## Full-Stack Logic Testing

- [x] Test 1: Real-time price sync (Admin change → Frontend auto-update without refresh)
- [x] Test 2: Manual override protection (is_manual_override=true blocks IIKO sync)
- [x] Test 3: Stress test (5 rapid price changes → verify tRPC subscription stability)
- [x] Generate comprehensive test report (TEST_REPORT.md created)

## Tencent Cloud Deployment

- [x] Generate automated deployment script (install deps + DB init + PM2 start)
- [x] Create Nginx configuration (HTTPS + API reverse proxy + WebSocket)
- [x] Generate .env.production template with DATABASE_URL
- [x] Create deployment validation checklist
- [x] Test real-time sync after deployment (documented in DEPLOYMENT_GUIDE.md)

## One-Click Deployment for 43.166.239.99

- [x] Generate comprehensive deployment script with environment setup
- [x] Create schema.sql for database initialization with 10 SKUs (embedded in script)
- [x] Generate Nginx configuration for port 80 → 3000 proxy (embedded in script)
- [x] Add deployment verification commands (curl tests embedded in script)
- [x] Test deployment script locally before delivery

## Feature Development (1-8) - Admin Controlled, UI Preserved

### 1. Payment Integration (Tinkoff/YooKassa)
- [x] Create payment gateway adapter (Tinkoff + YooKassa)
- [x] Implement Hold-Capture-Void state machine
- [x] Add admin payment settings panel (enable/disable, test mode, API keys)
- [ ] Update checkout flow to use real payment gateway (deferred - frontend integration)
- [ ] Add payment status webhook handlers (deferred - webhook setup)

### 2. IIKO POS Integration
- [x] Create IIKO API adapter (products, orders, stock)
- [x] Add admin IIKO settings panel
- [x] Implement manual sync with override protection
- [ ] Implement scheduled auto-sync job (every 5 minutes) - deferred
- [ ] Add admin IIKO settings panel (API credentials, sync frequency)
- [ ] Add admin manual sync trigger button
- [ ] Respect is_manual_override flag during sync

### 3. Telegram Mini App
- [x] Create Telegram bot integration module
- [x] Add admin Telegram settings panel
- [x] Implement order notifications via Telegram
- [ ] Create Telegram Bot with Mini App support
- [ ] Implement T-prefix order generation
- [ ] Add Telegram authentication flow
- [ ] Add admin Telegram settings panel (bot token, webhook URL)
- [ ] Sync Telegram orders to main order system

### 4. Membership System
- [x] Create membership tiers (Bronze, Silver, Gold, Platinum)
- [x] Implement points accumulation and redemption
- [x] Add coupon system
- [x] Create admin membership management endpoints
- [ ] Create users/members database schema
- [ ] Implement points accumulation logic
- [ ] Create coupons system (generation, validation, redemption)
- [ ] Add VIP level tiers (Bronze/Silver/Gold/Platinum)
- [ ] Add admin membership panel (points rules, coupon management, VIP benefits)
- [ ] Update Profile page to show membership info (no UI redesign)

### 5. Delivery Management
- [x] Create delivery zones and fee calculation
- [x] Implement address management
- [x] Add driver assignment system
- [x] Create admin delivery management endpoints
- [ ] Create delivery addresses database schema
- [ ] Implement address CRUD in Profile page
- [ ] Create delivery zones and pricing rules
- [ ] Add admin delivery settings panel (zones, pricing, estimated time)
- [ ] Add order tracking status updates

### 6. Marketing Features
- [x] Create campaign system (Discount, BOGO, Flash Sale, Happy Hour)
- [x] Implement time-based and condition-based rules
- [x] Add admin campaign builder endpoints
- [ ] Create promotions database schema (discounts, BOGO, bundle deals)
- [ ] Implement promotion engine (automatic price calculation)
- [ ] Add admin marketing panel (create campaigns, set rules, schedule)
- [ ] Update product cards to show promotion badges (no UI redesign)
- [ ] Add promotion code input in checkout

### 7. Multi-language Switcher
- [x] Create i18n translation system (ZH/EN/RU)
- [x] Add admin translation editor endpoints
- [x] Implement translation import/export
- [ ] Add language selector to Profile page
- [ ] Create i18n translation files (zh.json, en.json, ru.json)
- [ ] Implement frontend language switching logic
- [ ] Add admin translation editor panel
- [ ] Persist user language preference in database

### 8. Analytics Dashboard
- [x] Create sales report generator
- [x] Implement product analytics tracking
- [x] Add user behavior analytics
- [x] Create admin dashboard summary endpoint
- [ ] Create analytics events tracking (page views, orders, revenue)
- [ ] Implement sales reports (daily/weekly/monthly)
- [ ] Add popular products ranking
- [ ] Create admin analytics dashboard (charts, tables, exports)
- [ ] Add user behavior tracking (funnel analysis)

## Engineering Standards (Production Ready)

### 1. Git Workflow & Version Control
- [x] Create dev branch from main
- [x] Add .gitignore for proper exclusions (already exists)
- [ ] Document branching strategy in README
- [ ] Ensure all commits have clear messages

### 2. Environment Consistency
- [x] Add .nvmrc to lock Node version
- [x] Verify pnpm-lock.yaml is complete
- [ ] Test installation on clean environment
- [ ] Document exact versions in README (in progress)

### 3. Dev/Prod Environment Separation
- [x] Create ENV_VARIABLES.md documentation
- [x] Separate dev and prod API endpoints (via NODE_ENV)
- [x] Add environment-specific build scripts
- [ ] Document deployment process (in progress)

### 4. Scalable Project Structure
- [x] Create unified API client wrapper
- [x] Separate business logic from UI components (service layer created)
- [x] Add service layer for backend logic
- [x] Design multi-tenant architecture foundation

### 5. Logging & Error Handling
- [x] Add unified logging system (Pino)
- [x] Implement error boundaries in React
- [x] Add API error interceptors (in api-client.ts)
- [x] Create error reporting mechanism

### 6. Documentation
- [x] Write comprehensive README.md
- [x] Create DEVELOPMENT.md guide
- [x] Add API documentation (in DEVELOPMENT.md)
- [x] Write troubleshooting FAQ (in README.md and DEVELOPMENT.md)
