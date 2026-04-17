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

console.log("[vercel:prebuild] production build detected, running prisma migrate deploy");

try {
  execSync("pnpm db:migrate:deploy", { stdio: "inherit" });
  console.log("[vercel:prebuild] prisma migrate deploy completed");
} catch (error) {
  console.error("[vercel:prebuild] prisma migrate deploy failed, aborting build", error);
  process.exit(1);
}
