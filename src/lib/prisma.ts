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
    // Queries against remote Supabase/Postgres can be slower than local dev.
    // Keep this timeout high enough to avoid false positives on occasional slow reads.
    query_timeout: 30_000,
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

export async function reconnectPrismaClient() {
  try {
    await prisma.$disconnect();
  } catch (error) {
    console.error("[prisma] failed to disconnect before reconnect", error);
  }

  try {
    await prisma.$connect();
  } catch (error) {
    console.error("[prisma] failed to reconnect", error);
    throw error;
  }
}
