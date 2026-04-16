const TRANSIENT_PRISMA_ERROR_CODES = new Set([
  "P1001",
  "P1008",
  "P2024",
]);

const TRANSIENT_PRISMA_ERROR_FRAGMENTS = [
  "connection terminated due to connection timeout",
  "timeout exceeded when trying to connect",
  "connection terminated unexpectedly",
  "server has closed the connection",
  "connection error",
  "connection timed out",
];

function getErrorMessage(error: unknown) {
  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return "";
}

function getErrorCode(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    return (error as { code: string }).code;
  }

  return undefined;
}

export function isTransientPrismaConnectionError(error: unknown) {
  const code = getErrorCode(error);

  if (code && TRANSIENT_PRISMA_ERROR_CODES.has(code)) {
    return true;
  }

  const message = getErrorMessage(error).toLowerCase();

  return TRANSIENT_PRISMA_ERROR_FRAGMENTS.some((fragment) =>
    message.includes(fragment),
  );
}

export function getDatabaseActionErrorMessage(
  error: unknown,
  fallbackMessage: string,
  options?: {
    preserveKnownErrorMessage?: boolean;
  },
) {
  if (isTransientPrismaConnectionError(error)) {
    return fallbackMessage;
  }

  if (options?.preserveKnownErrorMessage) {
    const message = getErrorMessage(error).trim();

    if (message) {
      return message;
    }
  }

  return fallbackMessage;
}

export function logPrismaError(
  context: string,
  error: unknown,
  startedAt?: number,
) {
  const durationLabel =
    typeof startedAt === "number" ? ` after ${Date.now() - startedAt}ms` : "";

  if (error instanceof Error) {
    console.error(`[${context}] Prisma error${durationLabel}: ${error.name}`, error);
    return;
  }

  console.error(`[${context}] Prisma error${durationLabel}: unknown`, error);
}
