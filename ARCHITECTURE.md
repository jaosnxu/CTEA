# CHU TEA Platform Architecture

## 1. Core Philosophy
The CHU TEA platform is designed as a "Meituan-like" multi-tenant system with a premium "Apple-style" UI. It bridges the gap between a modern, high-speed frontend and the legacy stability of the IIKO POS system through a "Shadow DB" architecture.

## 2. System Architecture

### 2.1 The "Shadow DB" Principle
To ensure high performance and data sovereignty, the frontend **NEVER** communicates directly with the IIKO API for read operations.

*   **Sync Layer**: A background worker syncs products, stock, and modifiers from IIKO to our internal PostgreSQL database (Shadow DB).
*   **Enrichment**: The Admin Panel allows marketing teams to enrich raw IIKO data with high-res images, multi-language descriptions (ZH/EN/RU), and marketing tags (e.g., "Bestseller", "Seasonal").
*   **Read Path**: PWA/Telegram Bot reads exclusively from the Shadow DB for sub-millisecond response times.
*   **Write Path**: Orders are pushed to IIKO only at the moment of checkout.

### 2.2 Payment Pre-Authorization (Fail-Safe)
To prevent "Ghost Orders" (paid but not received by POS), we implement a strict **Hold-then-Capture** state machine:

1.  **HOLD**: User initiates payment. Funds are frozen (Pre-Auth) via Tinkoff/Sber/Yookassa.
2.  **PUSH**: System attempts to inject the order into IIKO POS.
3.  **DECISION**:
    *   *Success*: **CAPTURE** the funds. Order confirmed.
    *   *Failure/Timeout*: **VOID** the transaction immediately. User is notified, and funds are released instantly.

### 2.3 Order Prefix System
To distinguish order sources in a unified kitchen stream, we use a prefix generator:

*   **T**: Telegram Bot
*   **P**: PWA (Web)
*   **K**: Kiosk / Delivery Aggregators
*   **M**: Mall / Pickup

**Format**: `[Prefix][YYYYMMDD][Sequence]` (e.g., `P20240106001`)

## 3. Technical Stack

*   **Frontend**: React 19, Tailwind CSS 4, Shadcn/UI (Glassmorphism Design).
*   **Backend**: Node.js (Express/NestJS) or Go.
*   **Database**: PostgreSQL (Primary), Redis (Caching/Session).
*   **Infrastructure**: Dockerized Microservices, CDN for static assets in Russia/CIS.

## 4. Security & Compliance

*   **RBAC**: Strict separation between Head Office (Global Config) and Franchisees (Store Ops).
*   **Data Privacy**: Compliant with local data residency laws (servers located in region).
*   **Audit Log**: All price changes and order state transitions are immutably logged.
