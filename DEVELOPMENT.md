# CHU TEA - Development Guide

This guide helps new developers get the project running in **under 30 minutes**.

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] **Node.js 22.13.0** installed (use `nvm` or `fnm` for version management)
- [ ] **pnpm 10.4.1+** installed (`npm install -g pnpm`)
- [ ] **Git** installed
- [ ] **Code editor** (VS Code recommended)
- [ ] **PostgreSQL** (optional for development, uses mock data by default)

## 30-Minute Quick Start

### Step 1: Clone and Install (5 minutes)

```bash
# Clone the repository
git clone https://github.com/jaosnxu/CTEA.git
cd CTEA

# Switch to correct Node version (if using nvm)
nvm use

# Install dependencies
pnpm install
```

**Expected output**: Dependencies installed successfully, no errors.

### Step 2: Start Development Server (2 minutes)

```bash
# Start both frontend and backend
pnpm dev
```

**Expected output**:
```
[07:00:51] Server running on http://localhost:3000/
[07:00:52] ➜  Local:   http://localhost:5173/
```

### Step 3: Verify Installation (3 minutes)

Open your browser and visit:

1. **Frontend**: http://localhost:5173
   - Should see CHU TEA homepage with product catalog
   
2. **Backend API**: http://localhost:3000/health
   - Should return: `{"status":"ok"}`

3. **Admin Panel**: http://localhost:5173/admin/products
   - Should see product management interface

### Step 4: Make Your First Change (10 minutes)

Let's modify a product price to verify the system works:

1. Open http://localhost:5173/admin/products
2. Click "Edit Price" on any product
3. Change the price (e.g., from ₽350 to ₽400)
4. Click "Save"
5. Open http://localhost:5173/order in a new tab
6. **Verify**: Price updated instantly without refresh

**✅ If you see the price change, your environment is working correctly!**

### Step 5: Explore the Codebase (10 minutes)

Key files to understand:

```
client/src/
├── App.tsx              # Main app with routes
├── pages/
│   ├── Home.tsx         # Homepage
│   ├── Order.tsx        # Product catalog and cart
│   ├── Orders.tsx       # Order history
│   └── AdminProducts.tsx # Admin price management
└── lib/
    └── api-client.ts    # API request wrapper

server/
├── _core/
│   ├── index.ts         # Server entry point
│   ├── trpc.ts          # tRPC setup
│   └── logger.ts        # Logging system
├── routers.ts           # API endpoints
└── db_mock.ts           # Mock database (development)
```

## Project Architecture

### Three-Layer Architecture

```
┌─────────────────────────────────────────┐
│         Frontend (React PWA)            │
│  Pages → Components → API Client        │
└─────────────────┬───────────────────────┘
                  │ tRPC (Type-safe)
┌─────────────────▼───────────────────────┐
│         Backend (Node.js)               │
│  Routers → Services → Data Access       │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         Database (PostgreSQL)           │
│  Products, Orders, Users, Settings      │
└─────────────────────────────────────────┘
```

### Layer Responsibilities

| Layer | Responsibility | Example |
|-------|----------------|---------|
| **Pages** | UI layout, user interaction | `Order.tsx` renders product list |
| **Components** | Reusable UI elements | `Button`, `Card`, `Dialog` |
| **API Client** | HTTP requests, error handling | `trpc.products.list.useQuery()` |
| **Routers** | HTTP endpoints, validation | `admin.products.update` |
| **Services** | Business logic | Calculate price with discount |
| **Data Access** | Database queries | `db.products.findMany()` |

### Data Flow Example: Update Product Price

```
User clicks "Save" in AdminProducts.tsx
         ↓
trpc.admin.products.update.useMutation()
         ↓
server/routers.ts → admin.products.update
         ↓
Validate input (Zod schema)
         ↓
Update database (db_mock.ts)
         ↓
Set is_manual_override = true
         ↓
Return updated product
         ↓
Frontend auto-refreshes via tRPC
         ↓
Order.tsx shows new price
```

## Development Workflow

### Running Different Modes

```bash
# Development (hot reload enabled)
pnpm dev

# Type checking only (no server)
pnpm check

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Format code
pnpm format
```

### Environment Modes

| Mode | Command | Use Case |
|------|---------|----------|
| **Development** | `pnpm dev` | Local development with hot reload |
| **Production Build** | `pnpm build:prod` | Create optimized bundle for deployment |
| **Production Run** | `pnpm start:prod` | Run production server |

### Environment Variables

Development uses default values (no `.env` file needed):

```bash
NODE_ENV=development
PORT=3000
VITE_API_URL=http://localhost:3000
PAYMENT_PROVIDER=mock
LOG_LEVEL=debug
```

For production, see [ENV_VARIABLES.md](./ENV_VARIABLES.md).

## Common Development Tasks

### Adding a New Page

1. Create page component:
   ```typescript
   // client/src/pages/MyNewPage.tsx
   export default function MyNewPage() {
     return <div>My New Page</div>;
   }
   ```

2. Add route in `App.tsx`:
   ```typescript
   <Route path="/my-new-page" component={MyNewPage} />
   ```

3. Access at: http://localhost:5173/my-new-page

### Adding a New API Endpoint

1. Add procedure in `server/routers.ts`:
   ```typescript
   myNewEndpoint: publicProcedure
     .input(z.object({ name: z.string() }))
     .query(({ input }) => {
       return { message: `Hello ${input.name}` };
     })
   ```

2. Call from frontend:
   ```typescript
   const { data } = trpc.myNewEndpoint.useQuery({ name: 'World' });
   ```

### Modifying Product Data

Products are stored in `server/db_mock.ts`:

```typescript
export const PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name_ru: 'Клубничный Чиз',
    name_en: 'Strawberry Cheezo',
    name_zh: '草莓芝士',
    price: 350,
    category: 'Сезонное',
    image: '/products/strawberry-cheezo.png',
    is_manual_override: false,
  },
  // Add more products here
];
```

## Debugging

### Frontend Debugging

1. Open browser DevTools (F12)
2. Check Console for errors
3. Use React DevTools extension
4. Check Network tab for API calls

### Backend Debugging

1. Check terminal output (Pino logs)
2. Add `console.log()` or `logger.info()` statements
3. Use VS Code debugger:
   ```json
   // .vscode/launch.json
   {
     "type": "node",
     "request": "launch",
     "name": "Debug Server",
     "program": "${workspaceFolder}/server/_core/index.ts",
     "runtimeExecutable": "tsx"
   }
   ```

### Common Issues

**Issue**: Port 3000 already in use

**Solution**:
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

---

**Issue**: TypeScript errors after pulling new code

**Solution**:
```bash
# Clear TypeScript cache
rm -rf node_modules/.cache

# Reinstall dependencies
pnpm install
```

---

**Issue**: Hot reload not working

**Solution**:
```bash
# Restart dev server
# Press Ctrl+C, then run:
pnpm dev
```

## Code Style Guidelines

### TypeScript

- Use `interface` for object shapes
- Use `type` for unions and intersections
- Always define return types for functions
- Avoid `any`, use `unknown` if type is truly unknown

### React

- Use functional components with hooks
- Extract complex logic into custom hooks
- Keep components small (< 200 lines)
- Use `React.memo()` for expensive renders

### File Naming

- Components: `PascalCase.tsx` (e.g., `ProductCard.tsx`)
- Utilities: `kebab-case.ts` (e.g., `api-client.ts`)
- Pages: `PascalCase.tsx` (e.g., `Order.tsx`)

## Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Watch mode (re-run on file changes)
pnpm test:watch

# Coverage report
pnpm test --coverage
```

### Writing Tests

Example test for a utility function:

```typescript
// lib/utils.test.ts
import { describe, it, expect } from 'vitest';
import { formatPrice } from './utils';

describe('formatPrice', () => {
  it('should format price in rubles', () => {
    expect(formatPrice(350)).toBe('₽350');
  });
});
```

## Git Workflow

### Branch Strategy

```
main (production)
  ↑
dev (development)
  ↑
feature/my-feature (your work)
```

### Making Changes

```bash
# Create feature branch from dev
git checkout dev
git pull
git checkout -b feature/my-feature

# Make changes and commit
git add .
git commit -m "feat: add my feature"

# Push to remote
git push origin feature/my-feature

# Create pull request to dev branch
```

### Commit Message Format

```
<type>: <description>

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation changes
- style: Code style changes (formatting)
- refactor: Code refactoring
- test: Adding tests
- chore: Build process or tooling changes
```

## Performance Tips

### Frontend

- Use `React.memo()` for expensive components
- Lazy load routes with `React.lazy()`
- Optimize images (use WebP format)
- Use `useMemo()` and `useCallback()` for expensive calculations

### Backend

- Use database indexes for frequently queried fields
- Cache expensive operations
- Use connection pooling for database
- Enable gzip compression

## Next Steps

After completing this guide, you should:

1. ✅ Understand the project structure
2. ✅ Be able to run the project locally
3. ✅ Know how to add new features
4. ✅ Understand the data flow

**Ready to contribute?** Check the project's issue tracker for open tasks or discuss new features with the team.

## Additional Resources

- [README.md](./README.md) - Project overview
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [ENV_VARIABLES.md](./ENV_VARIABLES.md) - Environment configuration
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Production deployment

---

**Questions?** Contact the development team or create an issue in the repository.
