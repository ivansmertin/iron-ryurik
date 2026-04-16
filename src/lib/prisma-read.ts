import {
  isTransientPrismaConnectionError,
  logPrismaError,
} from "@/lib/prisma-errors";
import { reconnectPrismaClient } from "@/lib/prisma";

export async function withPrismaReadRetry<T>(
  operation: () => Promise<T>,
  retries = 1,
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
      await reconnectPrismaClient().catch((reconnectError) => {
        console.error("[prisma.read] failed to reconnect after transient error", reconnectError);
      });
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
}
