# Code Conventions and Patterns

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
```
src/
├── app/                 # Next.js App Router pages and layouts
│   ├── (auth)/         # Route groups for authentication
│   ├── (worker)/       # Worker-facing routes
│   ├── (biz)/          # Business-facing routes (removed)
│   ├── biz/            # Business routes (current)
│   └── api/            # API routes and webhooks
├── components/
│   ├── ui/             # Reusable UI components (shadcn/ui)
│   ├── shared/         # Shared components across user types
│   ├── worker/         # Worker-specific components
│   └── biz/            # Business-specific components
├── lib/
│   ├── actions/        # Server Actions
│   ├── services/       # Business logic services
│   ├── validations/    # Zod validation schemas
│   └── db/             # Database configuration
└── generated/          # Generated code (Prisma client)
```

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