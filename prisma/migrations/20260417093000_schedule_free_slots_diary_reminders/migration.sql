-- Session free-slot metadata and per-session cancellation policy.
CREATE TYPE "SessionOrigin" AS ENUM ('manual', 'auto_free');

ALTER TABLE "Session"
  ADD COLUMN "origin" "SessionOrigin" NOT NULL DEFAULT 'manual',
  ADD COLUMN "autoSlotKey" TEXT,
  ADD COLUMN "cancellationDeadlineHours" INTEGER NOT NULL DEFAULT 2;

CREATE UNIQUE INDEX "Session_autoSlotKey_key" ON "Session"("autoSlotKey");
CREATE INDEX "Session_origin_startsAt_idx" ON "Session"("origin", "startsAt");

-- Auto-created diary entries for confirmed attendance.
ALTER TABLE "WorkoutLog"
  ADD COLUMN "diaryReminderSentAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "WorkoutLog_userId_sessionId_key" ON "WorkoutLog"("userId", "sessionId");
CREATE INDEX "WorkoutLog_diaryReminderSentAt_performedAt_idx" ON "WorkoutLog"("diaryReminderSentAt", "performedAt");

-- Gym schedule settings.
CREATE TABLE "GymSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "freeSlotCapacity" INTEGER NOT NULL DEFAULT 8,
    "freeSlotDurationMinutes" INTEGER NOT NULL DEFAULT 60,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymSettings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "GymSettings_singleton_check" CHECK ("id" = 1),
    CONSTRAINT "GymSettings_capacity_check" CHECK ("freeSlotCapacity" BETWEEN 1 AND 20),
    CONSTRAINT "GymSettings_duration_check" CHECK ("freeSlotDurationMinutes" = 60)
);

CREATE TABLE "GymWorkingHour" (
    "id" UUID NOT NULL,
    "weekday" INTEGER NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT false,
    "opensAtMinutes" INTEGER NOT NULL DEFAULT 540,
    "closesAtMinutes" INTEGER NOT NULL DEFAULT 1260,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymWorkingHour_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "GymWorkingHour_weekday_key" UNIQUE ("weekday"),
    CONSTRAINT "GymWorkingHour_weekday_check" CHECK ("weekday" BETWEEN 1 AND 7),
    CONSTRAINT "GymWorkingHour_minutes_check" CHECK (
      "opensAtMinutes" >= 0
      AND "opensAtMinutes" < "closesAtMinutes"
      AND "closesAtMinutes" <= 1440
      AND "opensAtMinutes" % 60 = 0
      AND "closesAtMinutes" % 60 = 0
    )
);

ALTER TABLE public."GymSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."GymWorkingHour" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gym_settings_select ON public."GymSettings";
DROP POLICY IF EXISTS gym_settings_insert ON public."GymSettings";
DROP POLICY IF EXISTS gym_settings_update ON public."GymSettings";
DROP POLICY IF EXISTS gym_settings_delete ON public."GymSettings";

CREATE POLICY gym_settings_select
  ON public."GymSettings"
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY gym_settings_insert
  ON public."GymSettings"
  FOR INSERT
  TO authenticated
  WITH CHECK ((select public.current_user_role()) = 'admin');

CREATE POLICY gym_settings_update
  ON public."GymSettings"
  FOR UPDATE
  TO authenticated
  USING ((select public.current_user_role()) = 'admin')
  WITH CHECK ((select public.current_user_role()) = 'admin');

CREATE POLICY gym_settings_delete
  ON public."GymSettings"
  FOR DELETE
  TO authenticated
  USING ((select public.current_user_role()) = 'admin');

DROP POLICY IF EXISTS gym_working_hour_select ON public."GymWorkingHour";
DROP POLICY IF EXISTS gym_working_hour_insert ON public."GymWorkingHour";
DROP POLICY IF EXISTS gym_working_hour_update ON public."GymWorkingHour";
DROP POLICY IF EXISTS gym_working_hour_delete ON public."GymWorkingHour";

CREATE POLICY gym_working_hour_select
  ON public."GymWorkingHour"
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY gym_working_hour_insert
  ON public."GymWorkingHour"
  FOR INSERT
  TO authenticated
  WITH CHECK ((select public.current_user_role()) = 'admin');

CREATE POLICY gym_working_hour_update
  ON public."GymWorkingHour"
  FOR UPDATE
  TO authenticated
  USING ((select public.current_user_role()) = 'admin')
  WITH CHECK ((select public.current_user_role()) = 'admin');

CREATE POLICY gym_working_hour_delete
  ON public."GymWorkingHour"
  FOR DELETE
  TO authenticated
  USING ((select public.current_user_role()) = 'admin');

REVOKE ALL ON TABLE public."GymSettings" FROM anon;
REVOKE ALL ON TABLE public."GymSettings" FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."GymSettings" TO authenticated;

REVOKE ALL ON TABLE public."GymWorkingHour" FROM anon;
REVOKE ALL ON TABLE public."GymWorkingHour" FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."GymWorkingHour" TO authenticated;
