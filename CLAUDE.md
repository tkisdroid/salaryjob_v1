@AGENTS.md

<!-- GSD:project-start source:PROJECT.md -->
## Project

**GigNow (NJob)**

GigNow는 일본 Timee를 벤치마킹한 한국형 초단기/스팟 알바 매칭 플랫폼입니다. Worker와 Business를 잇는 양면 마켓플레이스로, "탐색 → 원탭 지원 → 근무 → 즉시 정산" 루프 하나만 집요하게 최적화합니다.

**Core Value:** **이력서·면접 제로. 탭 하나로 확정, 근무 후 즉시 정산.** — 다른 모든 기능은 이 단일 경험을 방해하지 않는 한에서만 존재합니다.

### Constraints

- **Tech stack**: Next.js 16 (App Router) + React 19 + Prisma 7 + Supabase (DB + Auth) — 변경하려면 PROJECT.md 업데이트 필수.
- **Data model**: PostgreSQL + PostGIS (위치 기반 쿼리 필수) — Supabase 기본 제공.
- **Auth provider**: Supabase Auth (Clerk/NextAuth 제외) — 데이터와 인증을 단일 벤더로 통합하여 복잡도 최소화.
- **Mock removal**: Phase 2 종료 시점에 `src/lib/mock-data.ts` 의존 경로 0개여야 함. 이 파일이 남아있으면 Phase 2는 미완료.
- **UX 원칙**: Timee의 "면접 없음 · 당일 근무 · 즉시 정산" 3축을 깨는 기능 설계 금지.
- **Performance**: "탐색 → 지원 → 확정" 플로우가 실제 DB 왕복으로도 1분 이내 완료되어야 Phase 2 성공.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Framework & Runtime
- **Next.js**: 16.2.1 (App Router)
- **React**: 19.2.4 (React 19 with React DOM 19.2.4)
- **TypeScript**: ^5
- **Node.js**: Targeting ES2017, bundler module resolution
## Database & ORM
- **Database**: PostgreSQL with PostGIS extension
- **ORM**: Prisma 7.5.0 with Prisma Client
- **Database Adapter**: @prisma/adapter-pg 7.5.0 for PostgreSQL connection pooling
- **Driver**: pg ^8.20.0 (Node.js PostgreSQL driver)
- **Generated Client**: Custom output path to src/generated/prisma
## UI Framework & Styling
- **CSS Framework**: Tailwind CSS ^4 (with PostCSS)
- **Component Library**: Radix UI ^1.4.3 + shadcn/ui ^4.1.0
- **Base Components**: @base-ui/react ^1.3.0
- **Icons**: Lucide React ^1.7.0
- **Styling Utilities**: 
## Form Handling & Validation
- **Forms**: React Hook Form ^7.72.0
- **Form Validation**: @hookform/resolvers ^5.2.2
- **Schema Validation**: Zod ^4.3.6
## State Management & Data Fetching
- **Client State**: Zustand ^5.0.12 (lightweight state management)
- **Server State**: @tanstack/react-query ^5.95.2 (data fetching & caching)
- **Date Utilities**: date-fns ^4.1.0
## Development Tools
- **TypeScript**: Type definitions for Node.js, React, PostgreSQL
- **Linting**: ESLint ^9 with Next.js config
- **Environment**: dotenv ^17.3.1 for environment variable loading
## Build Tools & Configuration
- **Package Manager**: npm (based on package-lock.json)
- **Build System**: Next.js built-in Turbopack
- **TypeScript Config**: 
- **PostCSS**: @tailwindcss/postcss ^4
## API & Backend Features
- **API Routes**: Next.js App Router route handlers
- **Webhooks**: Toss Payments integration
- **Cron Jobs**: Scheduled functions for settlements and cleanup
- **Push Notifications**: Custom push notification system
- **Background Processing**: Planned Vercel AI Gateway integration
## Performance & Optimization
- **Code Splitting**: Next.js dynamic imports
- **Image Optimization**: Next.js built-in image optimization
- **Caching**: React Query for client-side caching
- **Database**: Connection pooling with Prisma adapter
## Deployment Target
- **Platform**: Configured for Vercel deployment
- **Runtime**: Node.js serverless functions
- **Environment**: Development, production, and preview environments
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## TypeScript Usage
### Strict Type Safety
- **Strict mode enabled**: `strict: true` in tsconfig.json
- **No implicit any**: All variables and functions explicitly typed
- **Enum definitions**: Comprehensive enums defined in both Prisma schema and TypeScript types
- **String literal unions**: Preferred over enums for type definitions (e.g., `UserRole`, `PostType`, `ApplicationStatus`)
### Type Organization
- **Centralized types**: Main type definitions in `src/lib/types.ts`
- **Generated types**: Prisma client generates comprehensive database types in `src/generated/prisma/`
- **Validation schemas**: Zod schemas in `src/lib/validations/` for runtime validation
- **Interface definitions**: Readonly interfaces for UI components (e.g., `NavItem`, `Category`)
## Component Conventions
### File Naming
- **Kebab-case**: All files use kebab-case (e.g., `mobile-tab-bar.tsx`, `biz-sidebar.tsx`)
- **Page files**: Always named `page.tsx` in route directories
- **Layout files**: Always named `layout.tsx` in route directories
- **Component suffixes**: UI components in `components/ui/` follow descriptive naming
### Component Structure
- **Server Components by default**: No `"use client"` unless client-side features needed
- **Client components**: Explicitly marked with `"use client"` directive
- **Server Actions**: Marked with `"use server"` directive in separate action files
- **Export patterns**: Named exports for utilities, default exports for components
### Props and Interfaces
- **Readonly properties**: UI configuration objects use `readonly` modifier
- **Generic constraints**: Proper use of generic types with `VariantProps` pattern
- **Component props**: Extend HTML element attributes where appropriate
- **Forward refs**: Proper forwardRef usage for UI components
## File Organization Standards
### Directory Structure
### Import Conventions
- **Absolute imports**: Use `@/` path mapping for all internal imports
- **Import order**: External dependencies first, then internal imports
- **Type imports**: Use `type` keyword for type-only imports
- **Default exports**: For page components, layouts, and main component exports
## Code Style and Formatting
### CSS and Styling
- **Tailwind CSS**: Primary styling framework
- **Class composition**: Use `cn()` utility (clsx + tailwind-merge) for conditional classes
- **Variant-based components**: Use `class-variance-authority` for component variants
- **Global styles**: Minimal global CSS in `globals.css`
### String and Text Conventions
- **Korean language**: Primary interface language is Korean
- **Error messages**: User-facing errors in Korean
- **Constants**: Defined in `src/lib/constants.ts` with proper typing
- **Internationalization**: Prepared for i18n with structured text constants
### Component Patterns
- **Compound components**: UI components use composition pattern
- **Polymorphic components**: `asChild` pattern for flexible component rendering
- **Display names**: All components have proper `displayName` for debugging
- **Default variants**: UI components define sensible defaults
## Database and API Conventions
### Prisma Patterns
- **UUID primary keys**: All models use UUID `@id @default(uuid()) @db.Uuid`
- **Timestamps**: Consistent `createdAt` and `updatedAt` fields
- **Enums**: Comprehensive enum definitions for all status fields
- **Relations**: Proper foreign key constraints with cascade behavior
- **Indexes**: Strategic indexing for performance optimization
### Server Actions
- **File naming**: `*-actions.ts` suffix for server action files
- **Error handling**: Consistent error response format with `success` boolean
- **Return types**: Standardized return objects with success/error states
- **Validation**: Input validation using Zod schemas
- **Transaction safety**: Proper database transaction handling
### API Route Structure
- **Route handlers**: Follow Next.js App Router conventions (`route.ts`)
- **HTTP methods**: Proper method handling (GET, POST, etc.)
- **Error responses**: Consistent JSON error format
- **Authentication**: Placeholder for auth integration ("mock-user-id")
## State Management
### Client State
- **React Hook Form**: Form state management with validation
- **Zustand**: Global client state (referenced in dependencies)
- **TanStack Query**: Server state management
- **Component state**: React useState for local component state
### Server State
- **Prisma Client**: Database operations with connection pooling
- **Global singleton**: Proper Prisma client singleton pattern
- **Connection management**: PostgreSQL adapter with connection string configuration
## Quality Patterns
### Error Handling
- **Graceful failures**: All async operations wrapped in try-catch
- **User-friendly messages**: Error messages appropriate for end users
- **Logging**: Console error logging for debugging (development)
- **Validation**: Both client-side and server-side validation
### Performance Considerations
- **Database indexing**: Strategic indexes on frequently queried fields
- **Image optimization**: Placeholder for `next/image` usage
- **Bundle optimization**: TypeScript path mapping for cleaner imports
- **Server-side rendering**: Leverages Next.js SSR capabilities
### Security Practices
- **Input validation**: Zod schemas for all user inputs
- **Database safety**: Parameterized queries through Prisma
- **Authentication placeholder**: Prepared for Clerk integration
- **CORS handling**: Proper API route configuration
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Overview
## App Router Structure
### Route Groups Organization
- `(auth)` - Authentication flows (login, signup, role selection)
- `(worker)` - Worker-facing application routes
- `(biz)` - Business/employer-facing application routes
- `biz/*` - Alternative business routes (legacy structure)
### Layout Hierarchy
```
```
### API Route Architecture
- **Matching System**: `/api/matching/` - Real-time job matching logic
- **Cron Jobs**: `/api/cron/` - Automated tasks (auto-approve, expire urgent posts)
- **Push Notifications**: `/api/push/` - Worker notification system
- **Webhooks**: `/api/webhooks/` - External service integrations (Clerk auth, Toss payments)
## Component Organization
### Shared Components (`/components/shared/`)
- Cross-platform UI elements
- Navigation components (MobileTabBar, BizSidebar)
- Common layout structures
### UI Components (`/components/ui/`)
- Design system components (shadcn/ui based)
- Reusable primitives (Button, Card, Input, etc.)
- Consistent styling and behavior
### Role-Specific Components
- `/components/worker/` - Worker app specific components
- `/components/biz/` - Business dashboard components
- Domain-specific functionality encapsulation
## Data Flow Patterns
### Database Layer
- **ORM**: Prisma with PostgreSQL + PostGIS extensions
- **Generated Client**: Custom output to `src/generated/prisma`
- **Multi-role Schema**: Worker profiles, Employer profiles, unified User model
### Business Logic Layer
- **Actions** (`/lib/actions/`): Server Actions for form handling and mutations
- **Services** (`/lib/services/`): Complex business logic and integrations
- **Validations** (`/lib/validations/`): Zod schemas for type safety
### State Management
- **Server State**: React Server Components by default
- **Client State**: Zustand for complex client-side state
- **Form State**: React Hook Form with Zod validation
- **Caching**: TanStack React Query for API state management
## Authentication & Authorization
### Authentication Strategy
- **Provider**: Clerk (webhook integration at `/api/webhooks/clerk`)
- **Multi-role Support**: WORKER, EMPLOYER, BOTH, ADMIN roles
- **Session Management**: Server-side session handling
- **Route Protection**: Layout-level authentication checks
### Authorization Patterns
- Role-based route access through layout components
- Business verification system for employer accounts
- Profile completion requirements for full platform access
## Real-time Features
### Instant Matching System
- **AI Matching Service**: Location-based worker matching
- **Push Notifications**: Real-time job alerts via `/api/push/`
- **Urgent Posts**: Time-limited job postings with auto-expiry
- **Auto-scheduling**: Smart worker availability management
### Chat System
- **Real-time Messaging**: Application-based chat rooms
- **Message Types**: Text, Image, File, System, Location
- **Notification Integration**: In-app and push notifications
## Payment & Settlement Architecture
### Settlement Flow
- **Multi-status Processing**: Checkout → Approved → Processing → Settled
- **Commission System**: Configurable rates per employer partnership level
- **Retry Logic**: Built-in retry mechanisms for failed transactions
- **Integration**: Toss payments webhook at `/api/webhooks/toss`
### Financial Data Model
- Gross/Commission/Net amount tracking
- Transaction ID linking
- Settlement history with audit trail
## Matching Algorithm Architecture
### Core Matching Logic
- **Geographic Matching**: PostGIS-powered location queries
- **Availability Intersection**: Real-time worker availability checking
- **Preference Scoring**: Multi-factor matching algorithm
- **Urgent Matching**: Sub-10-minute response system
### Notification Pipeline
- **Push Registration**: Device token management
- **Multi-channel Delivery**: In-app, Push, SMS, Email
- **Batch Processing**: Efficient bulk notifications
- **Fallback Mechanisms**: Channel priority system
## Key Architectural Decisions
### Performance Optimizations
- **Server Components First**: Minimized client-side JavaScript
- **Streaming UI**: Progressive page loading
- **Database Indexes**: Optimized for location and time-based queries
- **Image Optimization**: Next.js Image component with CDN
### Scalability Considerations
- **Microservice-ready APIs**: Modular route handlers
- **Async Processing**: Background job system via cron routes
- **Caching Strategy**: Multi-layer caching (React, Next.js, Database)
- **Mobile-first Design**: Progressive enhancement approach
### Security Measures
- **Type Safety**: End-to-end TypeScript with strict mode
- **Input Validation**: Zod schemas at API boundaries
- **SQL Injection Protection**: Prisma ORM parameterized queries
- **Authentication Tokens**: Secure session management via Clerk
### Monitoring & Observability
- **Error Boundaries**: React error handling
- **Structured Logging**: Consistent log formatting
- **Performance Tracking**: Core Web Vitals optimization
- **Business Metrics**: Application completion rates, settlement success rates
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
