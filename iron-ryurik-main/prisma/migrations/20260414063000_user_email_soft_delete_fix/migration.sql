-- Soft-deleted users should not block re-registration with the same email.
-- Replace the global unique constraint with a partial unique index for active rows only.

DROP INDEX IF EXISTS public."User_email_key";

CREATE UNIQUE INDEX "User_email_active_key"
  ON public."User" (email)
  WHERE "deletedAt" IS NULL;
