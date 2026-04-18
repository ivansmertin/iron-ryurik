-- Find and cancel duplicate active memberships
-- Keeps the newest one for each user
UPDATE "Membership"
SET status = 'cancelled', "updatedAt" = NOW()
WHERE id IN (
  SELECT id
  FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY "createdAt" DESC) as rn
    FROM "Membership"
    WHERE status = 'active'
  ) t
  WHERE rn > 1
);
