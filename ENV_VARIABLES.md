# CHU TEA - Environment Variables Documentation

This document lists all environment variables used in the project. For production deployment, configure these in your hosting platform or create a `.env` file.

## Application Settings

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `development` | Yes |
| `PORT` | Server port | `3000` | Yes |

## Database Configuration

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/chutea_db` | Yes (Production) |

## Payment Gateway

| Variable | Description | Options | Required |
|----------|-------------|---------|----------|
| `PAYMENT_PROVIDER` | Payment provider to use | `tinkoff`, `yookassa`, `mock` | No (defaults to `mock`) |

### Tinkoff Settings

| Variable | Description | Required |
|----------|-------------|----------|
| `TINKOFF_TERMINAL_KEY` | Tinkoff terminal key | If using Tinkoff |
| `TINKOFF_SECRET_KEY` | Tinkoff secret key | If using Tinkoff |
| `TINKOFF_API_URL` | Tinkoff API endpoint | No (has default) |

### YooKassa Settings

| Variable | Description | Required |
|----------|-------------|----------|
| `YOOKASSA_SHOP_ID` | YooKassa shop ID | If using YooKassa |
| `YOOKASSA_SECRET_KEY` | YooKassa secret key | If using YooKassa |
| `YOOKASSA_API_URL` | YooKassa API endpoint | No (has default) |

## IIKO POS Integration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `IIKO_API_URL` | IIKO API base URL | `https://api-ru.iiko.services` | If using IIKO |
| `IIKO_API_LOGIN` | IIKO API login | - | If using IIKO |
| `IIKO_ORGANIZATION_ID` | IIKO organization ID | - | If using IIKO |
| `IIKO_SYNC_INTERVAL` | Sync interval (ms) | `300000` (5 min) | No |

## Telegram Bot

| Variable | Description | Required |
|----------|-------------|----------|
| `TELEGRAM_BOT_TOKEN` | Telegram bot token from @BotFather | If using Telegram |
| `TELEGRAM_WEBHOOK_URL` | Webhook URL for receiving updates | If using Telegram |
| `TELEGRAM_MINI_APP_URL` | Mini App URL | If using Telegram Mini App |

## Frontend Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_API_URL` | Backend API URL | `http://localhost:3000` | Yes |
| `VITE_APP_TITLE` | Application title | `CHU TEA` | No |
| `VITE_APP_LOGO` | Logo path | `/logo.png` | No |

## Infrastructure

### Redis Cache

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` | No (optional in dev) |

**Note:** Redis is optional in development (will use in-memory fallback). Required in production for high-performance caching.

### Sentry Error Tracking

| Variable | Description | Required |
|----------|-------------|----------|
| `SENTRY_DSN` | Backend Sentry DSN | No (optional) |
| `VITE_SENTRY_DSN` | Frontend Sentry DSN | No (optional) |
| `VITE_APP_VERSION` | App version for release tracking | No |

## Logging & Monitoring

| Variable | Description | Options | Default |
|----------|-------------|---------|---------|
| `LOG_LEVEL` | Logging level | `error`, `warn`, `info`, `debug` | `info` |

## Security

| Variable | Description | Required |
|----------|-------------|----------|
| `JWT_SECRET` | JWT signing secret | Yes (auto-generated in Manus) |
| `SESSION_SECRET` | Session encryption secret | Yes (auto-generated in Manus) |

## Multi-tenant (Future)

| Variable | Description | Options | Default |
|----------|-------------|---------|---------|
| `TENANT_MODE` | Tenant mode | `single`, `multi` | `single` |

---

## Environment-Specific Configuration

### Development

```bash
NODE_ENV=development
PORT=3000
VITE_API_URL=http://localhost:3000
PAYMENT_PROVIDER=mock
LOG_LEVEL=debug
```

### Production

```bash
NODE_ENV=production
PORT=3000
VITE_API_URL=https://your-domain.com

# Database
DATABASE_URL=postgresql://user:pass@db-host:5432/chutea_db

# Redis Cache
REDIS_URL=redis://redis-host:6379

# Sentry Error Tracking
SENTRY_DSN=https://your-backend-dsn@sentry.io/project-id
VITE_SENTRY_DSN=https://your-frontend-dsn@sentry.io/project-id
VITE_APP_VERSION=1.0.0

# Payment
PAYMENT_PROVIDER=tinkoff
TINKOFF_TERMINAL_KEY=your-key
TINKOFF_SECRET_KEY=your-secret

# IIKO Integration
IIKO_API_LOGIN=your-login
IIKO_ORGANIZATION_ID=your-org-id

# Logging
LOG_LEVEL=info
```

---

## How to Configure

### Manus Platform

Environment variables are managed through the Manus UI:
1. Go to **Settings → Secrets**
2. Add/edit variables as needed
3. Restart the server to apply changes

### Self-Hosted (Tencent Cloud / VPS)

1. Create `.env` file in project root
2. Copy variables from this documentation
3. Fill in actual values
4. Restart the application

### Docker

Pass environment variables via `-e` flag or `docker-compose.yml`:

```yaml
environment:
  - NODE_ENV=production
  - DATABASE_URL=postgresql://...
  - PAYMENT_PROVIDER=tinkoff
```

---

## Security Notes

⚠️ **Never commit `.env` files to Git**

⚠️ **Rotate secrets regularly in production**

⚠️ **Use strong, random values for JWT_SECRET and SESSION_SECRET**
