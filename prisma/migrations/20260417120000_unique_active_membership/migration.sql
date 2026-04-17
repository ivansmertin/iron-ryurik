-- Prevent duplicate active memberships per user.
-- Prisma does not support WHERE in @@unique, so the index lives only here.
-- See schema.prisma → Membership model for the reminder comment.

CREATE UNIQUE INDEX "Membership_userId_active_key"
  ON public."Membership" ("userId")
  WHERE status = 'active';
