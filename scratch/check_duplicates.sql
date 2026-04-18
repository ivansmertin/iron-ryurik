SELECT "userId", COUNT(*) FROM "Membership" WHERE status='active' GROUP BY "userId" HAVING COUNT(*) > 1;
