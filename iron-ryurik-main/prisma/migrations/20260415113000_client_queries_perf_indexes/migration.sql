-- Speed up trainer/admin client pages and trainer client card loading.
-- These indexes match current Prisma filters and ordering patterns.

CREATE INDEX "User_role_deletedAt_createdAt_idx"
  ON public."User" ("role", "deletedAt", "createdAt" DESC);

CREATE INDEX "Membership_userId_status_endsAt_idx"
  ON public."Membership" ("userId", "status", "endsAt");

CREATE INDEX "Program_trainerId_clientId_idx"
  ON public."Program" ("trainerId", "clientId");

CREATE INDEX "Program_trainerId_startsAt_idx"
  ON public."Program" ("trainerId", "startsAt" DESC);
