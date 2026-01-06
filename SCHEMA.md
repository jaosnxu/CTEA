# Database Schema Design

## 1. Overview
The database is designed to support multi-language content (ZH/EN/RU) natively at the column level to avoid complex join tables for simple translations. It follows the "Shadow DB" pattern where `external_id` links back to the IIKO POS system.

## 2. Core Tables

### `products`
The central catalog table. Synced from IIKO but enriched with local marketing data.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `external_id` | VARCHAR | ID from IIKO POS |
| `category_id` | UUID | FK to categories |
| `name_zh` | VARCHAR | Chinese Name |
| `name_en` | VARCHAR | English Name |
| `name_ru` | VARCHAR | Russian Name |
| `description_zh` | TEXT | Chinese Description |
| `description_en` | TEXT | English Description |
| `description_ru` | TEXT | Russian Description |
| `price` | DECIMAL | Base Price (RUB) |
| `image_url` | VARCHAR | High-res marketing image |
| `is_active` | BOOLEAN | Availability status |
| `is_manual_override` | BOOLEAN | **Shadow DB Flag**: Prevents IIKO sync from overwriting admin changes |
| `tags` | JSONB | e.g., ["Bestseller", "New"] |

### `product_variants`
Handles size and sugar/ice customizations.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `product_id` | UUID | FK to products |
| `name_ru` | VARCHAR | Variant Name (e.g., "Large") |
| `price_adjustment` | DECIMAL | Added cost (e.g., +50) |
| `external_id` | VARCHAR | Modifier ID in IIKO |

### `orders`
Stores the lifecycle of a transaction.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | VARCHAR | Custom ID (e.g., P20240106001) |
| `user_id` | UUID | FK to users |
| `total_amount` | DECIMAL | Final charge amount |
| `status` | ENUM | PENDING, PAID, COMPLETED, VOIDED, CANCELLED |
| `payment_id` | VARCHAR | Transaction ID from Payment Gateway |
| `iiko_order_id` | VARCHAR | Confirmed ID from IIKO |
| `items` | JSONB | Snapshot of items at time of purchase |
| `created_at` | TIMESTAMP | Creation time |

### `users`
Customer profiles and membership data.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `phone` | VARCHAR | Unique identifier |
| `level` | VARCHAR | Membership Tier (VIP1, VIP2) |
| `points` | INTEGER | Loyalty Points |
| `balance` | DECIMAL | Wallet Balance |
| `language` | VARCHAR | Preferred Language (ru/en/zh) |

## 3. Indexes & Performance
*   Index on `products(category_id, is_active)` for fast menu rendering.
*   Index on `orders(user_id, created_at)` for order history lookups.
*   Unique constraint on `orders(id)` to enforce prefix system integrity.
