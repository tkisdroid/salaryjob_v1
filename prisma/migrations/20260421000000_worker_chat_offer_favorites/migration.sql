-- Worker discovery persistence: favorites, offers, and two-party chat.
-- Constraint blocks are intentionally idempotent so manual dev DB recovery and
-- later migrate deploy runs do not fail on duplicate_object.

CREATE TABLE IF NOT EXISTS "favorite_workers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "businessUserId" UUID NOT NULL,
    "workerId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_workers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "worker_offers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "businessId" UUID NOT NULL,
    "workerId" UUID NOT NULL,
    "message" VARCHAR(500),
    "status" TEXT NOT NULL DEFAULT 'sent',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "worker_offers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "chat_threads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "applicationId" UUID,
    "jobId" UUID NOT NULL,
    "workerId" UUID NOT NULL,
    "businessUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_threads_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "chat_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "threadId" UUID NOT NULL,
    "senderId" UUID NOT NULL,
    "body" VARCHAR(1000) NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "favorite_workers_businessUserId_workerId_key"
    ON "favorite_workers"("businessUserId", "workerId");
CREATE INDEX IF NOT EXISTS "favorite_workers_businessUserId_idx"
    ON "favorite_workers"("businessUserId");
CREATE INDEX IF NOT EXISTS "favorite_workers_workerId_idx"
    ON "favorite_workers"("workerId");

CREATE INDEX IF NOT EXISTS "worker_offers_businessId_idx"
    ON "worker_offers"("businessId");
CREATE INDEX IF NOT EXISTS "worker_offers_workerId_idx"
    ON "worker_offers"("workerId");

CREATE UNIQUE INDEX IF NOT EXISTS "chat_threads_applicationId_key"
    ON "chat_threads"("applicationId");
CREATE UNIQUE INDEX IF NOT EXISTS "chat_threads_jobId_workerId_key"
    ON "chat_threads"("jobId", "workerId");
CREATE INDEX IF NOT EXISTS "chat_threads_workerId_updatedAt_idx"
    ON "chat_threads"("workerId", "updatedAt");
CREATE INDEX IF NOT EXISTS "chat_threads_businessUserId_updatedAt_idx"
    ON "chat_threads"("businessUserId", "updatedAt");

CREATE INDEX IF NOT EXISTS "chat_messages_threadId_createdAt_idx"
    ON "chat_messages"("threadId", "createdAt");
CREATE INDEX IF NOT EXISTS "chat_messages_senderId_idx"
    ON "chat_messages"("senderId");

DO $$ BEGIN
    ALTER TABLE "favorite_workers"
      ADD CONSTRAINT "favorite_workers_businessUserId_fkey"
      FOREIGN KEY ("businessUserId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "favorite_workers"
      ADD CONSTRAINT "favorite_workers_workerId_fkey"
      FOREIGN KEY ("workerId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "worker_offers"
      ADD CONSTRAINT "worker_offers_businessId_fkey"
      FOREIGN KEY ("businessId") REFERENCES "business_profiles"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "worker_offers"
      ADD CONSTRAINT "worker_offers_workerId_fkey"
      FOREIGN KEY ("workerId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "chat_threads"
      ADD CONSTRAINT "chat_threads_applicationId_fkey"
      FOREIGN KEY ("applicationId") REFERENCES "applications"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "chat_threads"
      ADD CONSTRAINT "chat_threads_jobId_fkey"
      FOREIGN KEY ("jobId") REFERENCES "jobs"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "chat_threads"
      ADD CONSTRAINT "chat_threads_workerId_fkey"
      FOREIGN KEY ("workerId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "chat_threads"
      ADD CONSTRAINT "chat_threads_businessUserId_fkey"
      FOREIGN KEY ("businessUserId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "chat_messages"
      ADD CONSTRAINT "chat_messages_threadId_fkey"
      FOREIGN KEY ("threadId") REFERENCES "chat_threads"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "chat_messages"
      ADD CONSTRAINT "chat_messages_senderId_fkey"
      FOREIGN KEY ("senderId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
