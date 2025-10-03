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

## API Documentation

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for comprehensive API specifications, including:
- Complete endpoint documentation
- Request/response schemas
- Authentication requirements
- Error handling
- Frontend type definitions
- Common issues and solutions

**Important**: Always refer to API_DOCUMENTATION.md when implementing API calls to ensure frontend requests match backend validator expectations.

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

## Semantic Color System

The project uses a comprehensive semantic color system that provides consistent theming across all three applications while allowing each app to maintain its distinct visual identity.

### Architecture

#### Color Token Structure
The system uses CSS custom properties with semantic naming conventions organized into these categories:

- **Brand Colors**: Primary, Secondary, Accent with hover/active states
- **Surface Colors**: Card and component backgrounds with hierarchy
- **Background Colors**: Page and section backgrounds
- **Content Colors**: Text and icon colors with semantic hierarchy
- **Border Colors**: Consistent border styling across components
- **Status Colors**: Success, warning, error, and info states
- **Interactive States**: Hover, active, disabled, and focus states

#### Format Standards
- **Custom Properties**: RGB format (`249 115 22`) for maximum flexibility with alpha values
- **shadcn/ui Components**: HSL format for compatibility with existing components
- **Utility Classes**: Semantic naming for consistent usage patterns

### Application Themes

Each app has its own distinct theme while following the same semantic structure:

#### Customer App - Modern Blue/Orange Theme (2025)
- **Primary**: Vibrant Blue (#3B82F6) - Trust and modernity
- **Secondary**: Cyan/Teal (#06B6D4) - Fresh and energetic
- **Accent**: Logo Orange (#F97316) - Enthusiasm and CTAs

#### Restaurant Dashboard - Teal/Violet Hospitality Theme
- **Primary**: Deep Teal (#0D9488) - Professional, hospitality-focused
- **Secondary**: Violet (#8B5CF6) - Sophisticated, premium
- **Accent**: Logo Orange (#F97316) - Brand energy and CTAs

#### Admin Portal - Executive Indigo Theme (2025)
- **Primary**: Deep Indigo (#4F46E5) - Authority, innovation, executive
- **Secondary**: Cool Slate (#64748B) - Professional, balanced
- **Accent**: Electric Cyan (#06B6D4) - Data-focused, tech-forward, modern

### Implementation

#### Theme Files Location
Each app has its theme defined in:
```
apps/[app-name]/src/styles/theme.css
```

#### Tailwind Configuration
Semantic tokens are configured in:
```
packages/config/tailwind-config/semantic.js
```

#### Example Usage
```jsx
// ✅ Good - Using semantic tokens
<button className="bg-primary text-primary-foreground hover:bg-primary-hover">
  Save Changes
</button>
<div className="bg-surface border-default text-content-primary">
  Content Card
</div>

// ❌ Bad - Using hardcoded colors
<button className="bg-orange-500 text-white hover:bg-orange-600">
  Save Changes
</button>
<div className="bg-white border-gray-200 text-gray-900">
  Content Card
</div>
```

### Available Semantic Classes

#### Background Utilities
```css
.bg-surface             /* Primary surface color */
.bg-surface-secondary   /* Secondary surface level */
.bg-surface-tertiary    /* Tertiary surface level */
.bg-surface-elevated    /* Elevated surfaces (modals, dropdowns) */
```

#### Text Utilities
```css
.text-content-primary   /* Primary text content */
.text-content-secondary /* Secondary text content */
.text-content-tertiary  /* Tertiary text content */
.text-content-brand     /* Brand-colored text */
```

#### Border Utilities
```css
.border-default         /* Default border color */
.border-secondary       /* Secondary border color */
.border-focus           /* Focus state borders */
.border-error           /* Error state borders */
```

#### Status Utilities
```css
.status-success         /* Success messages/indicators */
.status-warning         /* Warning messages/indicators */
.status-error           /* Error messages/indicators */
.status-info            /* Info messages/indicators */
```

#### Button Variants
```css
.btn-primary           /* Primary action buttons */
.btn-secondary         /* Secondary action buttons */
.btn-outline           /* Outline style buttons */
.btn-ghost             /* Ghost/minimal buttons */
```

### Dark Mode Support

All themes include comprehensive dark mode variants that automatically apply when the `dark` class is present on the root element. Dark mode colors are carefully chosen to maintain the same semantic meaning while providing optimal contrast and readability.

### Integration with shadcn/ui

The system seamlessly integrates with shadcn/ui components by providing HSL format variables for compatibility:

```css
:root {
  --ring: 25 95% 53%;              /* Focus ring color */
  --input: 210 14% 83%;            /* Input border color */
  --muted: 210 40% 98%;            /* Muted backgrounds */
  --destructive: 0 84% 60%;        /* Destructive actions */
  /* ... additional shadcn variables */
}
```

### Best Practices

1. **Always use semantic tokens** instead of hardcoded color values
2. **Prefer semantic utility classes** over direct Tailwind color classes
3. **Test in both light and dark modes** to ensure proper contrast
4. **Maintain consistency** within each app's theme while respecting the semantic structure
5. **Extend thoughtfully** - add new semantic tokens rather than breaking the system

### Extension Guidelines

When adding new semantic colors:

1. **Define in theme.css**: Add both light and dark mode variants
2. **Update Tailwind config**: Add to `semantic.js` configuration
3. **Create utility classes**: Add corresponding CSS utilities
4. **Document usage**: Update this guide with new token purposes

For detailed implementation examples and troubleshooting, see [THEME_SYSTEM.md](./THEME_SYSTEM.md).

### Testing Strategy
- Unit tests with Vitest and Testing Library
- E2E tests with Playwright (customer app)
- Component documentation/testing with Storybook (customer app)
- Coverage reporting available

### Build Process
- Packages must be built before apps (handled by `turbo build` dependencies)
- Customer app includes bundle analyzer and PWA capabilities
- All apps configured for production builds with proper caching

### Instruction:
- Always carefully examine existing code before making changes
  - Check if functionality already exists elsewhere
  - Avoid creating duplicate APIs or methods
  - Understand the existing architecture and patterns
  - Don't rush to add new code without thorough investigation