import path from "node:path";
import { defineConfig } from "prisma/config";
import { config } from "dotenv";

config({ path: path.join(__dirname, ".env.local") });

export default defineConfig({
  schema: path.join(__dirname, "prisma/schema.prisma"),
  migrations: {
    seed: "node prisma/seed.mjs",
  },
  datasource: {
    // Prefer direct DB connection for migrations, fallback to pooled URL
    // when DIRECT_URL is not configured in the environment.
    url: process.env.DIRECT_URL || process.env.DATABASE_URL!,
  },
});
