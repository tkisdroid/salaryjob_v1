# External Service Integrations

## Payment Processing
- **Toss Payments**: 
  - Webhook endpoint: `/api/webhooks/toss`
  - Payment status updates and settlement processing
  - Retry logic for failed payments (RETRY_1, RETRY_2, RETRY_3)
  - Order format: `settlement_{settlementId}`

## Database Services
- **PostgreSQL**: 
  - Current: Local development with Prisma Postgres
  - Connection string: `DATABASE_URL`
  - PostGIS extension for geospatial features
  - Connection pooling via @prisma/adapter-pg

## Planned AI Services
- **Vercel AI Gateway**: 
  - AI-powered job matching (worker-to-post recommendations)
  - Reverse matching (employer-to-worker recommendations)
  - Structured output for match scoring and reasoning
  - Models: Anthropic Claude Sonnet planned

## Push Notifications
- **Custom Push System**: 
  - Device registration endpoint: `/api/push/register`
  - In-app notifications via Prisma
  - Notification channels: IN_APP, PUSH, SMS, EMAIL
  - Settlement completion notifications

## Scheduled Jobs & Automation
- **Cron Jobs**:
  - `/api/cron/auto-approve` - Automatic settlement approval
  - `/api/cron/expire-urgent` - Expire urgent job postings
- **Matching Services**:
  - `/api/matching/urgent` - Urgent job matching
  - `/api/matching/accept` - Application acceptance processing

## Authentication & Security
- **Environment Variables Required**:
  - `DATABASE_URL` - PostgreSQL connection string
  - `CRON_SECRET` - Cron job authentication (planned)
  - `TOSS_SECRET` - Toss webhook signature verification (planned)

## File Storage & Media
- **Media Management**:
  - User profile photos, portfolios, certificates
  - ID document verification uploads
  - AI moderation for uploaded content (planned)
  - Multiple media types: PROFILE_PHOTO, PORTFOLIO, CERTIFICATE, ID_DOCUMENT

## Geospatial Services
- **PostGIS Integration**:
  - Location-based job matching
  - Address geocoding (lat/lng storage)
  - Distance-based worker availability
  - Regional job filtering

## Third-Party Service Dependencies
- **Verification Services**: 
  - Business registration verification via NTS (National Tax Service)
  - Response validation and status tracking
- **Communication Channels**:
  - In-app chat system
  - SMS notifications (planned)
  - Email notifications (planned)
  - Slack alerts for critical failures (planned)

## Deployment & Infrastructure
- **Vercel Platform**: 
  - Serverless functions for API routes
  - Edge functions for performance-critical endpoints (potential)
  - Environment variable management
  - Preview deployments for testing
  - Production domain: Not yet configured

## Development Environment
- **Local Development**: 
  - Prisma local database with connection pooling
  - Development-specific logging and debugging
  - Hot reload with Next.js development server
  - Environment variable loading via dotenv

## Monitoring & Analytics
- **Error Handling**: 
  - Console error logging
  - Retry mechanisms for payment processing
  - Settlement failure alerts (planned)
- **User Analytics**: 
  - Post view counts, save counts, application counts
  - User engagement tracking via notifications
  - Rating and review systems