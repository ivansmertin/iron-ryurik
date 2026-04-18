import { execSync } from "node:child_process";

const isVercel = process.env.VERCEL === "1";
const vercelEnv = process.env.VERCEL_ENV;

if (!isVercel) {
  console.log("[vercel:prebuild] skip migrate deploy: VERCEL != 1");
  process.exit(0);
}

if (vercelEnv !== "production") {
  console.log(
    `[vercel:prebuild] skip migrate deploy: VERCEL_ENV=${vercelEnv ?? "undefined"}`,
  );
  process.exit(0);
}

const directUrl = process.env.DIRECT_URL;
if (!directUrl) {
  console.error(
    "[vercel:prebuild] DIRECT_URL is not set. Prisma migrate deploy must run through the direct (non-pooled) Supabase connection on port 5432. " +
      "Set DIRECT_URL in Vercel Production env vars and redeploy.",
  );
  process.exit(1);
}

console.log("[vercel:prebuild] production build detected, running prisma migrate deploy via DIRECT_URL");

try {
  // Force prisma to use the direct connection (port 5432) regardless of what
  // prisma.config.ts or DATABASE_URL point at — pgBouncer (pooled, 6543) in
  // transaction mode does not support the session-level advisory locks that
  // `prisma migrate deploy` relies on.
  execSync("pnpm db:migrate:deploy", {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: directUrl,
    },
  });
  console.log("[vercel:prebuild] prisma migrate deploy completed");
} catch (error) {
  console.error("[vercel:prebuild] prisma migrate deploy failed, aborting build", error);
  process.exit(1);
}
