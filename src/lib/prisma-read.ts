import {
  isTransientPrismaConnectionError,
  logPrismaError,
} from "@/lib/prisma-errors";

export async function withPrismaReadRetry<T>(
  operation: () => Promise<T>,
  retries = 1,
  context = "prisma.read",
) {
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
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
}
