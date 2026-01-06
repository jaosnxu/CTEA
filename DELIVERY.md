# CHU TEA PWA Delivery Documentation

## 1. Project Overview
A premium multi-tenant platform for a Russian milk tea chain, featuring a "Meituan-like" ordering experience, membership system, and shopping mall. The system is built with a "Shadow DB" architecture to ensure high availability and data sovereignty.

## 2. API Index

### Products
- **GET /api/products**
  - Returns the full list of products with multi-language support (ZH/EN/RU).
  - Includes variants (Regular/Large) and addons (Tapioca, Cheese Foam, etc.).

### Orders
- **GET /api/orders**
  - Returns the user's order history.
  - Fields: `id` (Prefix T/P/K/M), `status` (PENDING/PAID/COMPLETED/VOIDED), `total`, `items`.

### User Profile
- **GET /api/user/me**
  - Returns the current user's profile and assets.
  - Fields: `points`, `coupons`, `balance`, `level`.

### Payment
- **POST /api/payment/create**
  - Initiates a pre-authorization transaction.
  - Body: `{ "orderId": "string", "amount": number }`
  - Logic: Hold Funds -> Push to IIKO -> Capture (Success) / Void (Failure).

## 3. Database Schema (Shadow DB)

### Products Table
| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Primary Key |
| name_zh/en/ru | String | Localized product names |
| description_zh/en/ru | String | Localized descriptions |
| price | Integer | Base price in Rubles |
| category | String | seasonal, milktea, fruit_tea, mall |
| tags | Array | ["Bestseller", "New", "Tropical"] |

### Orders Table
| Field | Type | Description |
|-------|------|-------------|
| id | String | Format: [Prefix][Date][Seq] (e.g., P20240106001) |
| prefix | Enum | T (Telegram), P (PWA), K (Delivery), M (Pickup) |
| status | Enum | PENDING, PAID, COMPLETED, CANCELLED, VOIDED |
| total | Integer | Total amount in Rubles |
| created_at | Timestamp | Order creation time |

### Users Table
| Field | Type | Description |
|-------|------|-------------|
| id | String | Primary Key |
| level | String | VIP Level (e.g., VIP.1) |
| points | Integer | Loyalty points balance |
| coupons | Integer | Available coupons count |
| balance | Integer | Wallet balance in Rubles |

## 4. Deployment Notes
- **Frontend**: Static files in `client/dist`. Serve with Nginx or any static host.
- **Backend**: Node.js Express server. Run with `node server/index.js`.
- **Environment**: Ensure `NODE_ENV=production` for optimized performance.
- **Proxy**: Configure Nginx to forward `/api` requests to the backend (port 5000).
