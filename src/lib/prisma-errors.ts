const TRANSIENT_PRISMA_ERROR_CODES = new Set([
  "P1001",
  "P1008",
  "P2024",
]);

const SCHEMA_MISMATCH_PRISMA_ERROR_CODES = new Set(["P2021", "P2022"]);

const TRANSIENT_PRISMA_ERROR_FRAGMENTS = [
  "connection terminated due to connection timeout",
  "timeout exceeded when trying to connect",
  "connection terminated unexpectedly",
  "server has closed the connection",
  "connection error",
  "connection timed out",
  "query read timeout",
  "query timeout",
  "client has encountered a connection error and is not queryable",
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

function getErrorMeta(error: unknown) {
  if (error && typeof error === "object" && "meta" in error) {
    return (error as { meta?: unknown }).meta;
  }

  return undefined;
}

function toArray(value: string | string[] | undefined) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function getNormalizedErrorHaystack(error: unknown) {
  const message = getErrorMessage(error);
  const meta = getErrorMeta(error);
  const serializedMeta =
    meta === undefined
      ? ""
      : (() => {
          try {
            return JSON.stringify(meta);
          } catch {
            return "";
          }
        })();

  return `${message} ${serializedMeta}`.toLowerCase();
}

export function isPrismaSchemaMismatchError(
  error: unknown,
  options?: {
    modelName?: string | string[];
    columnFragment?: string | string[];
  },
) {
  const code = getErrorCode(error);

  if (!code || !SCHEMA_MISMATCH_PRISMA_ERROR_CODES.has(code)) {
    return false;
  }

  const expectedModels = toArray(options?.modelName).map((modelName) =>
    modelName.toLowerCase(),
  );

  if (expectedModels.length) {
    const meta = getErrorMeta(error);
    const modelName =
      meta && typeof meta === "object" && "modelName" in meta
        ? (meta as { modelName?: unknown }).modelName
        : undefined;

    if (
      typeof modelName !== "string" ||
      !expectedModels.includes(modelName.toLowerCase())
    ) {
      return false;
    }
  }

  const expectedColumnFragments = toArray(options?.columnFragment).map(
    (columnFragment) => columnFragment.toLowerCase(),
  );

  if (expectedColumnFragments.length) {
    const haystack = getNormalizedErrorHaystack(error);

    if (
      !expectedColumnFragments.some((columnFragment) =>
        haystack.includes(columnFragment),
      )
    ) {
      return false;
    }
  }

  return true;
}

const loggedSchemaWarningSignatures = new Set<string>();

export function logPrismaSchemaWarningOnce(
  context: string,
  signature: string,
  error: unknown,
) {
  const dedupeKey = `${context}:${signature}`;

  if (loggedSchemaWarningSignatures.has(dedupeKey)) {
    return false;
  }

  loggedSchemaWarningSignatures.add(dedupeKey);
  console.warn(`[${context}] Prisma schema drift detected (${signature})`, error);
  return true;
}

export function __resetPrismaSchemaWarningCacheForTests() {
  loggedSchemaWarningSignatures.clear();
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
