# CHU TEA Platform Architecture

**Technical Audit Report**
**Audit Date:** 2026-01-13
**Compliance Standard:** M3.4-GLOBAL-COMP-002A
**Target Market:** Russian Federation

---

## 1. Core Philosophy

The CHU TEA platform is designed as a "Meituan-like" multi-tenant system with a premium "Apple-style" UI. It bridges the gap between a modern, high-speed frontend and the legacy stability of the IIKO POS system through a "Shadow DB" architecture.

---

## 2. System Architecture

### 2.1 The "Shadow DB" Principle

To ensure high performance and data sovereignty, the frontend **NEVER** communicates directly with the IIKO API for read operations.

- **Sync Layer**: A background worker syncs products, stock, and modifiers from IIKO to our internal PostgreSQL database (Shadow DB).
- **Enrichment**: The Admin Panel allows marketing teams to enrich raw IIKO data with high-res images, multi-language descriptions (ZH/EN/RU), and marketing tags (e.g., "Bestseller", "Seasonal").
- **Read Path**: PWA/Telegram Bot reads exclusively from the Shadow DB for sub-millisecond response times.
- **Write Path**: Orders are pushed to IIKO only at the moment of checkout.
- **Override Protection**: `is_manual_override` flag prevents iiko sync from overwriting admin-set prices.

### 2.2 Payment Pre-Authorization (Fail-Safe)

To prevent "Ghost Orders" (paid but not received by POS), we implement a strict **Hold-then-Capture** state machine:

1.  **HOLD**: User initiates payment. Funds are frozen (Pre-Auth) via Tinkoff/Sber/Yookassa.
2.  **PUSH**: System attempts to inject the order into IIKO POS.
3.  **DECISION**:
    - _Success_: **CAPTURE** the funds. Order confirmed.
    - _Failure/Timeout_: **VOID** the transaction immediately. User is notified, and funds are released instantly.

### 2.3 Order Prefix System

To distinguish order sources in a unified kitchen stream, we use a prefix generator:

- **T**: Telegram Bot
- **P**: PWA (Web)
- **K**: Kiosk / Delivery Aggregators
- **M**: Mall / Pickup

**Format**: `[Prefix][YYYYMMDD][Sequence]` (e.g., `P20240106001`)

### 2.4 Local-First Write Strategy

When cloud PostgreSQL is unavailable, the system uses a resilient local-first write pattern:

```
Order Request → Write to SQLite (local) → Try Cloud Sync
                                              ↓
                                    Cloud Available?
                                    ↓           ↓
                                   YES          NO
                                    ↓           ↓
                              Sync to Cloud   Add to Queue
                              Mark as Synced  Retry (30s)
```

---

## 3. Technical Stack

### 3.1 Runtime Environment

| Component  | Version  | Notes                                               |
| ---------- | -------- | --------------------------------------------------- |
| Node.js    | v22 LTS  | **Required** - v24 has esbuild compatibility issues |
| pnpm       | v10.4.1+ | Package manager                                     |
| TypeScript | 5.x      | Strict mode enabled                                 |

### 3.2 Core Dependencies

| Package        | Version | Purpose             |
| -------------- | ------- | ------------------- |
| React          | 19.2.1  | Frontend framework  |
| Express        | 4.21.2  | HTTP server         |
| @trpc/server   | 11.8.1  | Type-safe API       |
| Prisma         | 7.2.0   | PostgreSQL ORM      |
| better-sqlite3 | 12.6.0  | Local SQLite driver |
| Vite           | 7.1.7   | Frontend bundler    |
| esbuild        | 0.25.0  | Backend bundler     |

### 3.3 Database Layer

- **Primary**: PostgreSQL 14+ (Cloud: 43.166.239.99)
- **Local Fallback**: SQLite (prisma/local.db)
- **ORM**: Prisma with PrismaPg adapter
- **Tables**: 74 total
- **Enums**: 25 total

### 3.4 Infrastructure

- **Cloud Provider**: Tencent Cloud
- **Web Server**: Nginx (reverse proxy)
- **Process Manager**: PM2 (cluster mode)
- **SSL**: Let's Encrypt (TLS 1.2/1.3)

---

## 4. Data Flow Architecture

### 4.1 Complete Request Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        COMPLETE DATA FLOW DIAGRAM                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐                                                            │
│  │ Telegram    │                                                            │
│  │ Mini App    │──┐                                                         │
│  └─────────────┘  │                                                         │
│                   │     ┌─────────────────────────────────────────────┐     │
│  ┌─────────────┐  │     │              EXPRESS SERVER                 │     │
│  │   PWA Web   │──┼────▶│                                             │     │
│  │    App      │  │     │  ┌─────────────┐    ┌─────────────┐        │     │
│  └─────────────┘  │     │  │   tRPC      │    │   REST API  │        │     │
│                   │     │  │  /api/trpc  │    │   /api/*    │        │     │
│  ┌─────────────┐  │     │  └──────┬──────┘    └──────┬──────┘        │     │
│  │ Admin Panel │──┘     │         │                  │               │     │
│  └─────────────┘        │         └────────┬─────────┘               │     │
│                         │                  │                          │     │
│                         │                  ▼                          │     │
│                         │         ┌─────────────────┐                │     │
│                         │         │  Prisma ORM     │                │     │
│                         │         │  (Query Layer)  │                │     │
│                         │         └────────┬────────┘                │     │
│                         │                  │                          │     │
│                         └──────────────────┼──────────────────────────┘     │
│                                            │                                 │
│                    ┌───────────────────────┼───────────────────────┐        │
│                    │                       │                       │        │
│                    ▼                       ▼                       ▼        │
│           ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐ │
│           │   PostgreSQL    │    │     SQLite      │    │    iiko POS     │ │
│           │   (Cloud DB)    │    │   (Local DB)    │    │   (External)    │ │
│           │ 43.166.239.99   │    │ prisma/local.db │    │ api-ru.iiko.    │ │
│           └─────────────────┘    └─────────────────┘    │   services      │ │
│                    │                       │            └─────────────────┘ │
│                    │                       │                     │          │
│                    └───────────┬───────────┘                     │          │
│                                │                                 │          │
│                                ▼                                 │          │
│                    ┌─────────────────────┐                       │          │
│                    │   Sync Service      │◀──────────────────────┘          │
│                    │ (Background 30s)    │                                  │
│                    │ - Local → Cloud     │                                  │
│                    │ - iiko → Local      │                                  │
│                    └─────────────────────┘                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Entity Relationship Overview

```
Organization (HQ) ──1:N──▶ Organization (Franchise) ──1:N──▶ Store
                                                              │
                                                         1:N  │
                                                              ▼
Users ──1:N──▶ Orders ──1:N──▶ OrderItems ◀──N:1── Products
                  │                                      │
                  │                                      │ Shadow DB
                  ▼                                      ▼
            iiko POS ◀────────────────────────── IikoShadowMenu
```

### 4.3 Multi-Tenant Hierarchy

```
Level 1: HQ (Headquarters)
    └── Level 2: ORG (Franchise Organization)
            └── Level 3: STORE (Individual Store)
```

---

## 5. External Integrations

### 5.1 iiko POS Integration

| Method                    | Purpose               | Status |
| ------------------------- | --------------------- | ------ |
| `getMenu(storeId)`        | Fetch product catalog | Mock   |
| `createOrder(request)`    | Submit order to POS   | Mock   |
| `getOrderStatus(orderId)` | Query order status    | Mock   |
| `syncSales(request)`      | Sync sales data       | Mock   |

**Configuration:** Set `IIKO_PROVIDER=real` in production.

### 5.2 Payment Gateways

| Gateway  | Purpose               | Status     |
| -------- | --------------------- | ---------- |
| Tinkoff  | Primary processor     | Configured |
| YooKassa | Alternative processor | Configured |

### 5.3 Telegram Bot

| Endpoint                           | Purpose               |
| ---------------------------------- | --------------------- |
| `POST /api/telegram/notify`        | Send notifications    |
| `POST /api/telegram/bind/generate` | Generate binding link |
| `GET /api/telegram/status`         | Service status        |

### 5.4 External Services

| Service    | Provider          | Purpose            |
| ---------- | ----------------- | ------------------ |
| SMS        | Tencent Cloud SMS | Phone verification |
| Storage    | Tencent Cloud COS | Product images     |
| Email      | SMTP (QQ Exmail)  | Notifications      |
| Monitoring | Sentry            | Error tracking     |

---

## 6. Security & Compliance

### 6.1 Access Control

- **RBAC**: Strict separation between Head Office (Global Config) and Franchisees (Store Ops).
- **Roles**: HQ_ADMIN, ORG_ADMIN, STORE_MANAGER, STORE_STAFF
- **Data Privacy**: Compliant with local data residency laws (servers located in region).

### 6.2 Audit Chain

All price changes and order state transitions are immutably logged using SHA-256 blockchain-style linking:

```
Genesis Record → Record1 → Record2 → ... → RecordN
     ↑              ↑          ↑
previousHash   sha256Hash  sha256Hash
 = 'GENESIS'   links to    links to
               previous    previous
```

### 6.3 Security Headers (Nginx)

```nginx
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

### 6.4 Port Configuration

| Port      | Service               | Access   |
| --------- | --------------------- | -------- |
| 80        | Nginx (HTTP redirect) | Public   |
| 443       | Nginx (HTTPS)         | Public   |
| 3000-3001 | Node.js (PM2)         | Internal |
| 5432      | PostgreSQL            | Internal |

---

## 7. CI/CD Pipeline

**Workflow:** `.github/workflows/zero-trust-audit.yml`

| Stage                       | Purpose              | Blocking     |
| --------------------------- | -------------------- | ------------ |
| 1. Environment Setup        | Install dependencies | Yes          |
| 2. Code Format Check        | Prettier validation  | Yes          |
| 3. TypeScript Type Check    | `tsc --noEmit`       | Yes          |
| 4. Unit Tests               | Vitest execution     | Yes          |
| 5. Build Verification       | Vite + esbuild       | Yes          |
| 6. Prisma Schema Validation | `prisma validate`    | Yes          |
| 7. Security Audit           | `pnpm audit`         | Warning only |
| 8. Final Compliance Gate    | All stages pass      | Yes          |

**Branch Protection:** All PRs must pass CI before merge. No local bypassing allowed.

---

## 8. Risk Assessment

### 8.1 Single Points of Failure

| Risk                         | Impact                     | Mitigation                         | Status      |
| ---------------------------- | -------------------------- | ---------------------------------- | ----------- |
| Cloud PostgreSQL unavailable | Orders cannot be processed | Local SQLite fallback + async sync | Implemented |
| iiko API timeout             | Orders stuck in pending    | Queue + retry mechanism            | Implemented |
| Node.js v24 incompatibility  | Server fails to start      | Version check + warning            | Implemented |
| Nginx crash                  | Site unavailable           | PM2 cluster mode (2 instances)     | Configured  |

### 8.2 Security Risks

| Risk          | Mitigation                       | Status     |
| ------------- | -------------------------------- | ---------- |
| SQL injection | Prisma ORM parameterized queries | Mitigated  |
| XSS attacks   | Security headers + CSP           | Configured |
| CSRF attacks  | CSRF token validation            | Configured |

### 8.3 Operational Risks

| Risk                             | Mitigation                   | Status  |
| -------------------------------- | ---------------------------- | ------- |
| iiko Real implementation missing | Complete RealIikoService     | Pending |
| No automated backups             | Configure PostgreSQL backups | Pending |
| Log files not rotated            | Configure logrotate          | Pending |

### 8.4 Recommendations

**Immediate Actions:**

1. Complete `RealIikoService` implementation before production launch
2. Configure automated PostgreSQL backups
3. Set up log rotation for PM2 and Nginx logs

**Short-term Actions:**

1. Configure external monitoring (Sentry, uptime checks)
2. Add rate limiting to public API endpoints
3. Document all n8n workflows if used externally

---

## 9. Environment Self-Check

Run the environment validation script before starting development:

```bash
./scripts/check-environment.sh
```

This script verifies:

- Node.js version (must be v22.x)
- pnpm installation
- Required environment variables
- Database connectivity

---

## Appendix A: API Endpoints

### Public Endpoints

- `GET /health` - Health check
- `POST /api/orders` - Create order (local-first)
- `GET /api/orders/local` - View local orders
- `GET /api/dashboard/stats` - Combined statistics

### Protected Endpoints

- `/api/trpc/*` - tRPC procedures
- `/api/admin-trpc/*` - Admin tRPC procedures

### Webhook Endpoints

- `POST /webhook/telegram` - Telegram callbacks
- `POST /webhook/payment` - Payment callbacks
- `POST /webhook/iiko` - iiko POS callbacks

---

**Document Version:** 2.0.0
**Last Updated:** 2026-01-13
**Author:** Technical Audit Team
