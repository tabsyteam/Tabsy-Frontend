# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is Tabsy Frontend - a QR code restaurant ordering platform built as a Turborepo monorepo with three main applications:

- **Customer App** (`@tabsy/customer`) - PWA for mobile ordering (port 3001)
- **Restaurant Dashboard** (`@tabsy/restaurant-dashboard`) - Management interface for restaurant staff
- **Admin Portal** (`@tabsy/admin-portal`) - System administration interface

## Architecture

### Monorepo Structure
- **Apps**: Three Next.js applications in `apps/` directory
- **Shared Packages**: Reusable packages in `packages/` directory
  - `@tabsy/ui-components` - Shared React components using Radix UI and Tailwind
  - `@tabsy/shared-types` - TypeScript type definitions
  - `@tabsy/shared-utils` - Utility functions
  - `@tabsy/api-client` - API client library
  - `@tabsy/react-query-hooks` - TanStack Query hooks
  - `@repo/eslint-config` - ESLint configuration
  - `@repo/typescript-config` - TypeScript configuration

### Technology Stack
- **Framework**: Next.js 15 with React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI primitives
- **Data Fetching**: TanStack Query
- **State Management**: Zustand
- **Form Handling**: React Hook Form + Zod
- **Testing**: Vitest (unit), Playwright (e2e), Storybook
- **Package Manager**: pnpm (required)

## Development Commands

### Installation & Setup
```bash
pnpm install
pnpm run setup  # Install deps + build packages
```

### Development
```bash
# All apps in parallel
pnpm run dev

# Individual apps
pnpm run dev:customer      # Customer app on port 3001
pnpm run dev:restaurant    # Restaurant dashboard
pnpm run dev:admin        # Admin portal
```

### Building
```bash
pnpm run build           # Build all apps and packages
pnpm run build:apps      # Build only applications
pnpm run build:packages  # Build only shared packages
```

### Testing
```bash
pnpm run test            # All tests
pnpm run test:unit       # Unit tests (Vitest)
pnpm run test:integration # Integration tests
pnpm run test:e2e        # E2E tests (Playwright)
pnpm run test:coverage   # Generate coverage reports
```

### Code Quality
```bash
pnpm run lint            # Lint all packages
pnpm run lint:fix        # Fix linting issues
pnpm run type-check      # TypeScript checking
pnpm run format          # Format with Prettier
pnpm run format:check    # Check formatting
```

### Other Commands
```bash
pnpm run clean           # Clean build artifacts
pnpm run storybook       # Start Storybook (customer app)
pnpm run generate:api    # Generate API client code
```

## Development Guidelines

### Package Dependencies
- All apps depend on shared workspace packages using `workspace:*` protocol
- Customer app is the most feature-rich with PWA capabilities, QR scanning, and Storybook
- Restaurant and Admin apps share similar tech stack but are more focused on dashboard functionality

### Filtering
Use Turbo filters to work with specific apps or packages:
```bash
turbo build --filter=@tabsy/customer
turbo dev --filter="./apps/*"
turbo lint --filter="./packages/*"
```

### Code Standards
- Uses ESLint with Next.js config and Prettier
- Husky git hooks with lint-staged for pre-commit checks
- Conventional commit messages enforced via commitlint
- TypeScript strict mode across all packages

### Testing Strategy
- Unit tests with Vitest and Testing Library
- E2E tests with Playwright (customer app)
- Component documentation/testing with Storybook (customer app)
- Coverage reporting available

### Build Process
- Packages must be built before apps (handled by `turbo build` dependencies)
- Customer app includes bundle analyzer and PWA capabilities
- All apps configured for production builds with proper caching