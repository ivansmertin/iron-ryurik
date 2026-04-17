-- Rename booking states to match the two-step attendance flow.
ALTER TABLE "Booking" ALTER COLUMN "status" DROP DEFAULT;
ALTER TYPE "BookingStatus" RENAME VALUE 'booked' TO 'pending';
ALTER TYPE "BookingStatus" RENAME VALUE 'attended' TO 'completed';
ALTER TABLE "Booking" ALTER COLUMN "status" SET DEFAULT 'pending';

-- Add attendance confirmation audit fields.
CREATE TYPE "BookingConfirmationMethod" AS ENUM ('qr', 'manual', 'no_show');

ALTER TABLE "Booking"
  ADD COLUMN "confirmedAt" TIMESTAMP(3),
  ADD COLUMN "confirmedById" UUID,
  ADD COLUMN "confirmationMethod" "BookingConfirmationMethod";

CREATE INDEX "Booking_membershipId_status_idx" ON "Booking"("membershipId", "status");

-- Direct client-side mutations are intentionally disabled for bookings.
-- Server actions perform booking/cancellation/attendance mutations through Prisma.
DROP POLICY IF EXISTS booking_insert ON public."Booking";
DROP POLICY IF EXISTS booking_update ON public."Booking";

CREATE POLICY booking_update_staff ON public."Booking"
  FOR UPDATE USING (
    public.current_user_role() IN ('admin', 'trainer')
  )
  WITH CHECK (
    public.current_user_role() IN ('admin', 'trainer')
  );

-- Cron should no longer auto-convert bookings into attended/completed records.
-- Attendance is charged only through QR/manual/no-show staff actions.
CREATE OR REPLACE FUNCTION public.process_gym_cron_jobs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    UPDATE public."Session"
    SET status = 'completed', "updatedAt" = NOW()
    WHERE status = 'scheduled'
      AND "startsAt" + ("durationMinutes" * interval '1 minute') < NOW();

    UPDATE public."Membership"
    SET status = 'expired', "updatedAt" = NOW()
    WHERE status = 'active'
      AND ("endsAt" < NOW() OR "visitsRemaining" <= 0);
END;
$$;
