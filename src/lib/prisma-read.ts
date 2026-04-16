import {
  isTransientPrismaConnectionError,
  logPrismaError,
} from "@/lib/prisma-errors";

export async function withPrismaReadRetry<T>(
  operation: () => Promise<T>,
  retries = 2,
  context = "prisma.read",
): Promise<T> {
  const startedAt = Date.now();
  let attempt = 0;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (!isTransientPrismaConnectionError(error) || attempt >= retries) {
        logPrismaError(context, error, startedAt);
        throw error;
      }

      attempt += 1;
      // When using pg.Pool via driver adapters, we do not want to call prisma.$disconnect()
      // because pool.end() destroys the pool permanently. The pg.Pool natively recreates dropped connections.
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
}
