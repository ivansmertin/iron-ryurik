-- Расширение триггера handle_user_delete:
-- при удалении пользователя в auth.users отменять pending DropInPass'ы.
-- Paid/refunded/cancelled/walk-in — не трогаем, это финансовая история.
--
-- Применяется через:
--   prisma db execute --file prisma/migrations/20260417150100_drop_in_soft_delete_cascade/migration.sql --url $DIRECT_URL
--   prisma migrate resolve --applied 20260417150100_drop_in_soft_delete_cascade
-- Shadow DB не даёт править функции на auth.* (см. CLAUDE.md).
-- Enum-касты полностью квалифицированы: search_path = ''.

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

  UPDATE public."DropInPass"
    SET status = 'cancelled'::public."DropInStatus",
        "cancelledAt" = NOW(),
        "cancelReason" = 'user_deleted',
        "updatedAt" = NOW()
    WHERE "userId" = OLD.id
      AND status = 'pending'::public."DropInStatus";

  RETURN OLD;
END;
$$;
