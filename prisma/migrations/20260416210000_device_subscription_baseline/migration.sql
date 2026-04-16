-- Baseline DeviceSubscription for databases created from migrations.
-- Live Supabase already has this table, so every statement is idempotent.

CREATE TABLE IF NOT EXISTS public."DeviceSubscription" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DeviceSubscription_endpoint_key"
  ON public."DeviceSubscription" ("endpoint");

CREATE INDEX IF NOT EXISTS "DeviceSubscription_userId_idx"
  ON public."DeviceSubscription" ("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'DeviceSubscription_userId_fkey'
      AND conrelid = 'public."DeviceSubscription"'::regclass
  ) THEN
    ALTER TABLE public."DeviceSubscription"
      ADD CONSTRAINT "DeviceSubscription_userId_fkey"
      FOREIGN KEY ("userId")
      REFERENCES public."User"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;
