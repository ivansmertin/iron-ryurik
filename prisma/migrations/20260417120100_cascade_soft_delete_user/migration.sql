-- Cascade soft-delete side effects:
-- when a user is deleted in auth.users, also cancel their pending bookings
-- and flip any active memberships to 'cancelled'.
-- Applied via `prisma db execute --file ... --url $DIRECT_URL`
-- + `prisma migrate resolve --applied 20260417120100_cascade_soft_delete_user`,
-- because the trigger sits on auth.users and shadow DB cannot run auth.* grants.
-- Enum casts MUST be fully qualified (search_path = '').

CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public."User"
    SET "deletedAt" = NOW(),
        "updatedAt" = NOW()
    WHERE id = OLD.id;

  UPDATE public."Booking"
    SET status = 'cancelled'::public."BookingStatus",
        "cancelledAt" = NOW(),
        "cancelReason" = 'user_deleted'
    WHERE "userId" = OLD.id
      AND status = 'pending'::public."BookingStatus";

  UPDATE public."Membership"
    SET status = 'cancelled'::public."MembershipStatus",
        "updatedAt" = NOW()
    WHERE "userId" = OLD.id
      AND status = 'active'::public."MembershipStatus";

  RETURN OLD;
END;
$$;
