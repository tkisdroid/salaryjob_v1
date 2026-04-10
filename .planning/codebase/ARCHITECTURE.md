# System Architecture - GigNow Job Platform

> **Drift note (2026-04-10):** This document was originally aspirational. Phase 2 (Supabase·Prisma·Auth) aligns it with actual installed stack. Clerk/Toss/Push references are being removed as each domain comes online.

## Overview
GigNow is a short-term gig work matching platform built with Next.js 16.2.1 App Router, featuring real-time job matching between workers and employers through AI-powered algorithms and instant notifications.

## App Router Structure

### Route Groups Organization
- `(auth)` - Authentication flows (login, signup, role selection)
- `(worker)` - Worker-facing application routes
- `(biz)` - Business/employer-facing application routes
- `biz/*` - Alternative business routes (legacy structure)

### Layout Hierarchy
```
Root Layout (src/app/layout.tsx)
├── Auth Layout (src/app/(auth)/layout.tsx) - Centered auth forms
├── Worker Layout (src/app/(worker)/layout.tsx) - Mobile-first with tab bar
└── Business Layout (src/app/biz/layout.tsx) - Desktop sidebar navigation
```

### API Route Architecture
- **Matching System**: `/api/matching/` - Real-time job matching logic
- **Cron Jobs**: `/api/cron/` - Automated tasks (auto-approve, expire urgent posts)
- **Push Notifications**: `/api/push/` - Deferred to v2 (not in Phase 2-5 scope)
- **Webhooks**: `/api/webhooks/` - Settlement system (v2 — Phase 2 does not implement real payments)

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
- **Provider**: Supabase Auth (Email/Password + Magic Link + Google OAuth; Kakao OAuth in Phase 2 final wave). No webhook — session managed via @supabase/ssr proxy. (Phase 2)
- **Multi-role Support**: WORKER, EMPLOYER, BOTH, ADMIN roles
- **Session Management**: Server-side session handling via @supabase/ssr cookie store
- **Route Protection**: Next.js proxy.ts (Plan 03) + layout-level role checks

### Authorization Patterns
- Role-based route access through layout components
- Business verification system for employer accounts
- Profile completion requirements for full platform access

## Real-time Features

### Instant Matching System
- **AI Matching Service**: Location-based worker matching (Phase 3+ — scaffold only in Phase 2)
- **Push Notifications**: Deferred to v2 (not in Phase 2-5 scope)
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
- **Integration**: Settlement system (v2 — Phase 2 does not implement real payments)

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
- **Authentication Tokens**: Secure session management via Supabase Auth (Phase 2)

### Monitoring & Observability
- **Error Boundaries**: React error handling
- **Structured Logging**: Consistent log formatting
- **Performance Tracking**: Core Web Vitals optimization
- **Business Metrics**: Application completion rates, settlement success rates