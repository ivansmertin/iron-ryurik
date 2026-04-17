-- Этот скрипт был применен к Supabase напрямую (pg_cron).
-- Он сохранен здесь для истории и документации бизнес-логики.

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION process_gym_cron_jobs()
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

SELECT cron.unschedule('gym_status_updater') 
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'gym_status_updater');

SELECT cron.schedule('gym_status_updater', '*/15 * * * *', 'SELECT process_gym_cron_jobs();');
