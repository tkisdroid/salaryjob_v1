# File and Directory Structure - GigNow Job Platform

## Project Root Structure
```
C:\Users\TG\Desktop\Njobplatform\
├── .env                     # Environment configuration
├── .next/                   # Next.js build output
├── .planning/               # Project planning documents
│   └── codebase/           # Architecture documentation
├── AGENTS.md               # Next.js version notes
├── CLAUDE.md               # Project instructions
├── README.md               # Project documentation
├── components.json         # shadcn/ui configuration
├── eslint.config.mjs       # ESLint configuration
├── next.config.ts          # Next.js configuration
├── package.json            # Dependencies and scripts
├── postcss.config.mjs      # PostCSS configuration
├── prisma/                 # Database schema and migrations
├── public/                 # Static assets
├── src/                    # Application source code
├── tsconfig.json           # TypeScript configuration
└── prisma.config.ts        # Prisma configuration
```

## Source Code Organization (`src/`)

### App Router Structure (`src/app/`)
```
src/app/
├── layout.tsx              # Root layout with fonts and metadata
├── page.tsx               # Landing/home page
├── globals.css            # Global styles
│
├── (auth)/                # Authentication route group
│   ├── layout.tsx         # Centered auth layout
│   ├── login/
│   │   └── page.tsx       # Login page
│   ├── role-select/
│   │   └── page.tsx       # Role selection page
│   └── signup/
│       └── page.tsx       # Signup page
│
├── (worker)/              # Worker application route group
│   ├── layout.tsx         # Worker layout with mobile tab bar
│   ├── apply/
│   │   └── [id]/
│   │       └── page.tsx   # Job application page
│   ├── chat/
│   │   ├── page.tsx       # Chat list
│   │   └── [roomId]/
│   │       └── page.tsx   # Individual chat room
│   ├── explore/
│   │   └── page.tsx       # Job exploration/search
│   ├── home/
│   │   └── page.tsx       # Worker dashboard
│   ├── my/                # Worker profile section
│   │   ├── page.tsx       # Profile overview
│   │   ├── applications/
│   │   │   └── page.tsx   # Application history
│   │   ├── availability/
│   │   │   └── page.tsx   # Availability management
│   │   ├── profile/
│   │   │   ├── page.tsx   # Profile view
│   │   │   └── edit/
│   │   │       └── page.tsx # Profile editing
│   │   ├── schedule/
│   │   │   └── page.tsx   # Work schedule
│   │   └── settlements/
│   │       └── page.tsx   # Payment history
│   ├── notifications/
│   │   └── page.tsx       # Notification center
│   ├── posts/
│   │   ├── new/
│   │   │   └── page.tsx   # Create job seeking post
│   │   └── [id]/
│   │       └── page.tsx   # Job post details
│   └── search/
│       └── page.tsx       # Advanced job search
│
├── biz/                   # Business/employer routes (alternative structure)
│   ├── layout.tsx         # Business layout with sidebar
│   ├── page.tsx           # Business dashboard
│   ├── chat/
│   │   └── page.tsx       # Business chat interface
│   ├── posts/
│   │   ├── page.tsx       # Job post management
│   │   ├── new/
│   │   │   └── page.tsx   # Create job post
│   │   └── [id]/
│   │       ├── page.tsx   # Job post details
│   │       └── applicants/
│   │           └── page.tsx # Application management
│   ├── profile/
│   │   └── page.tsx       # Business profile
│   ├── settings/
│   │   └── page.tsx       # Account settings
│   ├── settlements/
│   │   └── page.tsx       # Payment management
│   ├── verify/
│   │   └── page.tsx       # Business verification
│   └── workers/
│       ├── page.tsx       # Worker directory
│       └── [id]/
│           └── page.tsx   # Worker profile view
│
└── api/                   # API Routes
    ├── cron/              # Automated tasks
    │   ├── auto-approve/
    │   │   └── route.ts   # Auto-approve settlements
    │   └── expire-urgent/
    │       └── route.ts   # Expire urgent posts
    ├── matching/          # Job matching system
    │   ├── accept/
    │   │   └── route.ts   # Accept job application
    │   └── urgent/
    │       └── route.ts   # Create urgent job post
    ├── push/              # Push notification system
    │   └── register/
    │       └── route.ts   # Register push tokens
    └── webhooks/          # External service webhooks
        ├── clerk/
        │   └── route.ts   # Clerk authentication webhook
        └── toss/
            └── route.ts   # Toss payment webhook
```

### Component Organization (`src/components/`)

#### Shared Components (`src/components/shared/`)
- **mobile-tab-bar.tsx** - Worker app bottom navigation
- **biz-sidebar.tsx** - Business dashboard sidebar navigation
- Cross-platform reusable components

#### UI Components (`src/components/ui/`)
Design system components based on shadcn/ui:
- **avatar.tsx** - User avatar display
- **badge.tsx** - Status badges and labels
- **button.tsx** - Button variants and states
- **card.tsx** - Content containers
- **input.tsx** - Form input fields
- **label.tsx** - Form labels
- **select.tsx** - Dropdown selections
- **separator.tsx** - Visual dividers
- **skeleton.tsx** - Loading state placeholders
- **tabs.tsx** - Tab navigation
- **textarea.tsx** - Multi-line text input

#### Role-Specific Components
- **`src/components/worker/`** - Worker app specific components
  - **delight/** - Worker experience enhancements
- **`src/components/biz/`** - Business dashboard specific components

### Business Logic Layer (`src/lib/`)

#### Actions (`src/lib/actions/`)
Server Actions for form handling and data mutations:
- **availability-actions.ts** - Worker availability management
- **matching-actions.ts** - Job matching operations
- **post-actions.ts** - Job post CRUD operations
- **settlement-actions.ts** - Payment processing actions

#### Services (`src/lib/services/`)
Complex business logic and third-party integrations:
- **ai-matching.ts** - AI-powered job matching algorithms
- **auto-scheduling.ts** - Automatic scheduling optimization
- **checkout.ts** - Payment processing logic
- **favorite.ts** - Worker favoriting system
- **instant-matching.ts** - Real-time urgent job matching

#### Database (`src/lib/db/`)
Database connection and query utilities

#### Validations (`src/lib/validations/`)
Zod schemas for type-safe data validation

#### Utilities (`src/lib/`)
- **constants.ts** - Application constants and navigation items
- **format.ts** - Data formatting utilities
- **types.ts** - TypeScript type definitions
- **utils.ts** - General utility functions

### Generated Code (`src/generated/`)
```
src/generated/
└── prisma/           # Prisma generated client
    ├── internal/     # Internal Prisma files
    └── models/       # Generated model types
```

## Route Groups and Navigation Patterns

### Route Group Classification
- **`(auth)`** - Route group for authentication flows, isolated from main app
- **`(worker)`** - Worker-facing mobile application with tab bar navigation
- **`(biz)`** - Legacy business route group structure
- **`biz/`** - Current business dashboard with sidebar navigation

### Navigation Hierarchies
1. **Worker Navigation** - Bottom tab bar pattern:
   - Home, Explore, Availability (FAB), Chat, Profile
2. **Business Navigation** - Sidebar pattern:
   - Dashboard, Posts, Workers, Settlements, Chat, Settings

### Dynamic Routes
- **`[id]`** - Individual resource pages (posts, workers, chat rooms)
- **`[roomId]`** - Chat room specific routes
- Parameterized routes for resource detail views

## Asset Organization

### Static Assets (`public/`)
- Images, icons, and static files
- Served directly by Next.js

### Styling Architecture
- **globals.css** - Global styles and CSS variables
- **Tailwind CSS 4** - Utility-first styling
- **shadcn/ui** - Component design system
- **CSS-in-JS** - Component-scoped styles where needed

## Configuration Files

### Build and Development
- **next.config.ts** - Next.js configuration
- **tsconfig.json** - TypeScript compiler options
- **eslint.config.mjs** - Code linting rules
- **postcss.config.mjs** - PostCSS processing

### Package Management
- **package.json** - Dependencies and npm scripts
- **package-lock.json** - Locked dependency versions

### Database
- **prisma/schema.prisma** - Database schema definition
- **prisma.config.ts** - Prisma client configuration

### UI Framework
- **components.json** - shadcn/ui component configuration
- **tailwind.config.js** - Tailwind CSS configuration (implied)