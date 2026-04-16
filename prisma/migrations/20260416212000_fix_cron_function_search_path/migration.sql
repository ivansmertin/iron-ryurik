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

    UPDATE public."Booking"
    SET status = 'attended'
    FROM public."Session"
    WHERE public."Booking"."sessionId" = public."Session".id
      AND public."Session".status = 'completed'
      AND public."Booking".status = 'booked';

    UPDATE public."Membership"
    SET status = 'expired', "updatedAt" = NOW()
    WHERE status = 'active'
      AND ("endsAt" < NOW() OR "visitsRemaining" <= 0);
END;
$$;
