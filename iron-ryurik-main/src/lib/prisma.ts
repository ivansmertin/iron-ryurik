import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

function createPrismaClient() {
  // Use the pooled DATABASE_URL (Supavisor / pgbouncer on port 6543) so a
  // single worker keeps a small warm pool instead of churning connections.
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    min: 1,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 3_500,
    maxLifetimeSeconds: 60,
    query_timeout: 8_000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
  });

  pool.on("error", (err) => {
    console.error("[pg pool error]", err);
  });

  pool.on("remove", () => {
    if (process.env.NODE_ENV === "development") {
      console.log("[pg pool] connection removed");
    }
  });

  const adapter = new PrismaPg(pool, {
    onPoolError: (err) => console.error("[prisma-pg pool error]", err),
    onConnectionError: (err) => console.error("[prisma-pg connection error]", err),
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query"] : [],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
