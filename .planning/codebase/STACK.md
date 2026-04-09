# Technology Stack Analysis

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
  - class-variance-authority ^0.7.1 (component variants)
  - clsx ^2.1.1 (conditional classes)
  - tailwind-merge ^3.5.0 (Tailwind class merging)
  - tw-animate-css ^1.4.0 (animations)

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
  - Target: ES2017
  - Module: ESNext with bundler resolution
  - Path mapping: @/* -> ./src/*
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