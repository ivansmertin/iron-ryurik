import {
  isTransientPrismaConnectionError,
  logPrismaError,
} from "@/lib/prisma-errors";

const DEFAULT_PRISMA_READ_TIMEOUT_MS = 15_000;

async function withReadTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  context: string,
) {
  let timeoutId: NodeJS.Timeout | null = null;

  try {
    return await Promise.race([
      operation(),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`[${context}] query timeout after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export async function withPrismaReadRetry<T>(
  operation: () => Promise<T>,
  retries = 2,
  context = "prisma.read",
  timeoutMs = DEFAULT_PRISMA_READ_TIMEOUT_MS,
): Promise<T> {
  const startedAt = Date.now();
  let attempt = 0;

  while (true) {
    try {
      return await withReadTimeout(operation, timeoutMs, context);
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
