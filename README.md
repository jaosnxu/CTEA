# CHU TEA - Premium Milk Tea Platform

A production-ready, multi-tenant platform for Russian milk tea chains, featuring online ordering (PWA/Telegram Bot), membership management, and shopping mall functionality.

## Project Overview

**CHU TEA** is designed for long-term operation with support for multiple stores and franchisees. The platform integrates with IIKO POS systems, payment gateways (Tinkoff/YooKassa), and Telegram Mini Apps to provide a comprehensive digital solution for milk tea businesses.

### Key Features

- **Online Ordering**: PWA with real-time product catalog and cart management
- **Payment Integration**: Pre-authorization flow (Hold → Capture/Void) with Tinkoff and YooKassa
- **IIKO POS Sync**: Automatic product and inventory synchronization with manual override protection
- **Membership System**: Points, coupons, VIP tiers (Bronze/Silver/Gold/Platinum)
- **Delivery Management**: Zone-based pricing, address management, driver assignment
- **Marketing Campaigns**: Discounts, BOGO, flash sales, happy hour promotions
- **Multi-language Support**: Chinese, English, Russian (ZH/EN/RU)
- **Analytics Dashboard**: Sales reports, product analytics, user behavior tracking
- **Telegram Bot**: Order notifications and Mini App integration

## Technology Stack

### Frontend
- **React 19** with TypeScript
- **Tailwind CSS 4** for styling
- **tRPC** for type-safe API calls
- **Wouter** for client-side routing
- **Shadcn/ui** component library

### Backend
- **Node.js 22** with TypeScript
- **Express** web server
- **tRPC** for API layer
- **PostgreSQL** database
- **Drizzle ORM** for database access

### DevOps
- **pnpm** package manager
- **Vite** for frontend bundling
- **ESBuild** for backend bundling
- **Vitest** for testing

## Quick Start

### Prerequisites

- **Node.js**: 22.13.0 (use `.nvmrc` for version management)
- **pnpm**: 10.4.1+
- **PostgreSQL**: 14+ (for production)

### Installation

```bash
# Clone the repository
git clone https://github.com/jaosnxu/CTEA.git
cd CTEA

# Install dependencies
pnpm install
```

### Development

```bash
# Start development server (frontend + backend)
pnpm dev

# Frontend: http://localhost:5173
# Backend: http://localhost:3000
```

### Building for Production

```bash
# Build frontend and backend
pnpm run build:prod

# Output:
# - client/dist/ (frontend static files)
# - dist/ (backend bundle)
```

### Running in Production

```bash
# Start production server
pnpm start:prod

# Or use PM2 for process management
pm2 start dist/index.js --name chutea
```

## Project Structure

```
milktea-pwa/
├── client/                 # Frontend (React PWA)
│   ├── public/            # Static assets
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── lib/           # Utilities and API client
│   │   ├── hooks/         # Custom React hooks
│   │   └── contexts/      # React contexts
│   └── index.html
│
├── server/                # Backend (Node.js + Express)
│   ├── _core/            # Core server setup
│   │   ├── index.ts      # Server entry point
│   │   ├── trpc.ts       # tRPC configuration
│   │   └── logger.ts     # Logging system
│   ├── services/         # Business logic layer
│   ├── routers.ts        # tRPC routes
│   ├── payment-gateway.ts
│   ├── iiko-api.ts
│   ├── telegram-bot.ts
│   ├── membership.ts
│   ├── delivery.ts
│   ├── marketing.ts
│   ├── i18n.ts
│   └── analytics.ts
│
├── shared/               # Shared types and constants
│   └── const.ts
│
├── docs/                 # Documentation
│   ├── ARCHITECTURE.md
│   ├── SCHEMA.md
│   ├── TEST_REPORT.md
│   └── ENV_VARIABLES.md
│
├── deploy-oneclick.sh    # One-click deployment script
├── nginx-chutea.conf     # Nginx configuration
├── package.json
├── tsconfig.json
└── .nvmrc               # Node version lock
```

## Environment Configuration

See [ENV_VARIABLES.md](./ENV_VARIABLES.md) for detailed environment variable documentation.

### Quick Setup

1. Configure environment variables through Manus UI (Settings → Secrets)
2. Or create `.env` file for self-hosted deployment
3. Required variables:
   - `DATABASE_URL` (production only)
   - `PAYMENT_PROVIDER` (tinkoff/yookassa/mock)
   - `IIKO_API_LOGIN` (if using IIKO)
   - `TELEGRAM_BOT_TOKEN` (if using Telegram)

## Development Workflow

### Branch Strategy

- `main`: Production-ready code
- `dev`: Development branch (feature integration)
- `feature/*`: Feature branches (merge to dev)

### Commit Guidelines

Use clear, descriptive commit messages:

```bash
git commit -m "feat: add payment pre-authorization flow"
git commit -m "fix: resolve IIKO sync override issue"
git commit -m "docs: update deployment guide"
```

### Testing

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Type checking
pnpm check
```

## Deployment

### Tencent Cloud / VPS

Use the one-click deployment script:

```bash
# SSH into server
ssh root@your-server-ip

# Clone repository
git clone https://github.com/jaosnxu/CTEA.git
cd CTEA

# Run deployment script
sudo bash deploy-oneclick.sh
```

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed instructions.

### Manus Platform

1. Save checkpoint in Manus UI
2. Click "Publish" button in Management UI
3. Configure custom domain (optional)

## Architecture Highlights

### Shadow DB Pattern

Products are synced from IIKO but can be manually enriched by admins. The `is_manual_override` flag prevents IIKO sync from overwriting manual changes.

### Payment Pre-Authorization

1. **Hold**: Reserve funds via payment gateway
2. **Push**: Send order to IIKO
3. **Capture**: Charge customer if IIKO succeeds
4. **Void**: Release funds if IIKO fails

### Order Prefix System

Orders are prefixed by source:
- `T`: Telegram Mini App
- `P`: PWA
- `K`: Delivery (доставка)
- `M`: Pickup (самовывоз)

### Multi-tenant Ready

The service layer is designed to support multiple tenants (franchisees) with data isolation and tenant-specific configuration.

## Troubleshooting

### Common Issues

**Issue**: `pnpm install` fails with peer dependency warnings

**Solution**: These warnings are safe to ignore. The project uses Vite 7 which is compatible.

---

**Issue**: Development server won't start

**Solution**: 
1. Check if port 3000 is available: `lsof -i :3000`
2. Verify Node version: `node --version` (should be 22.13.0)
3. Clear node_modules and reinstall: `rm -rf node_modules && pnpm install`

---

**Issue**: Database connection errors in production

**Solution**: Verify `DATABASE_URL` environment variable is set correctly with SSL enabled:
```
postgresql://user:pass@host:5432/dbname?sslmode=require
```

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture and design principles
- [SCHEMA.md](./SCHEMA.md) - Database schema documentation
- [ENV_VARIABLES.md](./ENV_VARIABLES.md) - Environment variable reference
- [TEST_REPORT.md](./TEST_REPORT.md) - Testing and validation results
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development guide (coming soon)

## Support

For issues, questions, or feature requests, please contact the development team or create an issue in the repository.

## License

MIT License - see LICENSE file for details

---

**Version**: 1.0.0  
**Last Updated**: January 2026  
**Maintained by**: CHU TEA Development Team
