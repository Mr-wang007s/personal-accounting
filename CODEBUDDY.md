# CODEBUDDY.md This file provides guidance to CodeBuddy when working with code in this repository.

## Commands

### Development
```bash
# Install dependencies (from root)
pnpm install

# Start web development server (http://localhost:5173)
pnpm dev:web

# Start backend development server (requires Nest.js setup)
pnpm dev:backend

# Start all packages in dev mode
pnpm dev
```

### Build & Test
```bash
# Build all packages (respects dependency order via Turborepo)
pnpm build

# Build specific app
pnpm build:web
pnpm build:backend

# Run E2E tests (Playwright, requires web app running)
pnpm test:e2e

# Run E2E tests with UI
cd apps/web && pnpm test:e2e:ui

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Format code
pnpm format
```

### Package-specific
```bash
# Build shared packages (required before running apps)
cd packages/shared && pnpm build
cd packages/business-logic && pnpm build

# Run unit tests for business-logic
cd packages/business-logic && pnpm test
```

## Architecture

### Monorepo Structure

This is a **Turborepo + pnpm workspace** monorepo for a personal accounting application. The architecture separates concerns into shared packages and application-specific code.

```
personal-accounting/
├── packages/           # Shared libraries
│   ├── shared/         # Types, constants, utilities
│   ├── business-logic/ # Pure business logic (calculations, statistics)
│   └── ui-components/  # Reusable UI components (planned)
└── apps/
    ├── web/            # React + Vite frontend
    └── backend/        # Nest.js API (scaffolded, not implemented)
```

### Package Dependencies

```
@personal-accounting/web
    └── @personal-accounting/business-logic
            └── @personal-accounting/shared
    └── @personal-accounting/shared

@personal-accounting/backend
    └── @personal-accounting/business-logic
    └── @personal-accounting/shared
```

**Important**: Always build shared packages before running apps. Turborepo handles this via `dependsOn: ["^build"]` in `turbo.json`.

### Core Packages

#### `@personal-accounting/shared`
Central type definitions, constants, and utilities shared across all packages.

- **Types** (`src/types/index.ts`): `Record`, `Category`, `Statistics`, `DateRange`, API response types
- **Constants** (`src/constants/index.ts`): `EXPENSE_CATEGORIES`, `INCOME_CATEGORIES`, `CHART_COLORS`, category lookup functions
- **Utils** (`src/utils/index.ts`): Date formatting (`dayjs` wrapper), currency formatting, ID generation, validation

**Export paths**:
```typescript
import { Record, Category } from '@personal-accounting/shared/types'
import { EXPENSE_CATEGORIES, getCategoryById } from '@personal-accounting/shared/constants'
import { formatCurrency, dayjs, generateId } from '@personal-accounting/shared/utils'
```

#### `@personal-accounting/business-logic`
Pure function implementations for all business calculations. Framework-agnostic, testable in isolation.

- **RecordCalculator** (`src/records/index.ts`): Balance calculation, category breakdown, monthly trends, date filtering/sorting/grouping
- **StatisticsService** (`src/statistics/index.ts`): Complete statistics generation, monthly/yearly stats, period comparison

**Key design**: All methods are static and operate on arrays of `Record` objects. No side effects, no state.

```typescript
import { RecordCalculator } from '@personal-accounting/business-logic/records'
import { StatisticsService } from '@personal-accounting/business-logic/statistics'

const balance = RecordCalculator.calculateBalance(records)
const stats = StatisticsService.getStatistics(records, dateRange)
```

### Web Application (`apps/web`)

**Stack**: React 18 + TypeScript + Vite + Tailwind CSS + Radix UI primitives

#### State Management
- **RecordsContext** (`src/context/RecordsContext.tsx`): Global state for records and statistics
- **StorageService** (`src/services/storageService.ts`): localStorage persistence layer (to be replaced with API calls)

#### Navigation
Simple state-based routing in `App.tsx`. Pages: `home`, `record`, `income`, `expense`, `records`, `statistics`.

#### UI Components
- **Layout**: `BottomNav`, `Header`, `PageContainer`
- **Common**: `CategoryIcon`, `EmptyState`
- **UI primitives** (`src/components/ui/`): shadcn/ui style components using Radix UI

#### Pages
| Page | File | Purpose |
|------|------|---------|
| Home | `HomePage.tsx` | Dashboard with balance overview, quick actions, recent records |
| Record Form | `RecordFormPage.tsx` | Add/edit income or expense records |
| Records List | `RecordsPage.tsx` | View all records with filtering |
| Statistics | `StatisticsPage.tsx` | Charts and category breakdown |

### Data Model

```typescript
interface Record {
  id: string           // Generated unique ID
  type: 'income' | 'expense'
  amount: number
  category: string     // Category ID (e.g., 'food', 'salary')
  date: string         // YYYY-MM-DD format
  note?: string
  createdAt: string    // ISO timestamp
}
```

**Categories**: Predefined in `shared/constants`. 10 expense categories (餐饮, 交通, 购物...) and 6 income categories (工资, 奖金, 投资...). Each has `id`, `name`, `icon` (Lucide icon name), `type`.

### Current Limitations

1. **No backend**: Data persists only in localStorage
2. **No authentication**: Single-user, local-only
3. **No real routing**: State-based page switching (no URL support)

### Development Roadmap

1. **Backend API**: Implement Nest.js with Prisma + PostgreSQL
2. **Authentication**: CloudBase or custom auth
3. **Data sync**: Replace localStorage with API calls
4. **Multi-device**: Cloud storage for cross-device access
