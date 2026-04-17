import { beforeEach, describe, it, expect, vi } from "vitest";
import {
  __resetPrismaSchemaWarningCacheForTests,
  isTransientPrismaConnectionError,
  isPrismaSchemaMismatchError,
  getDatabaseActionErrorMessage,
  logPrismaSchemaWarningOnce,
  logPrismaError,
} from "../prisma-errors";

describe("Prisma Errors Utility", () => {
  beforeEach(() => {
    __resetPrismaSchemaWarningCacheForTests();
    vi.restoreAllMocks();
  });

  describe("isTransientPrismaConnectionError", () => {
    it("identifies known transient error codes", () => {
      expect(isTransientPrismaConnectionError({ code: "P1001" })).toBe(true);
      expect(isTransientPrismaConnectionError({ code: "P1008" })).toBe(true);
      expect(isTransientPrismaConnectionError({ code: "P2024" })).toBe(true);
    });

    it("identifies transient error message fragments", () => {
      expect(
        isTransientPrismaConnectionError(new Error("connection terminated unexpectedly"))
      ).toBe(true);
      expect(
        isTransientPrismaConnectionError({ message: "Server has closed the connection" })
      ).toBe(true);
    });

    it("returns false for non-transient errors", () => {
      expect(isTransientPrismaConnectionError({ code: "P2002" })).toBe(false);
      expect(isTransientPrismaConnectionError(new Error("Unique constraint failed"))).toBe(false);
      expect(isTransientPrismaConnectionError(null)).toBe(false);
    });
  });

  describe("isPrismaSchemaMismatchError", () => {
    it("identifies schema mismatch by code", () => {
      expect(
        isPrismaSchemaMismatchError({
          code: "P2021",
          meta: { modelName: "DropInPass" },
        }),
      ).toBe(true);
      expect(
        isPrismaSchemaMismatchError({
          code: "P2022",
          meta: { modelName: "Session" },
        }),
      ).toBe(true);
    });

    it("filters by modelName", () => {
      const error = {
        code: "P2021",
        meta: { modelName: "DropInPass" },
      };

      expect(
        isPrismaSchemaMismatchError(error, { modelName: "DropInPass" }),
      ).toBe(true);
      expect(
        isPrismaSchemaMismatchError(error, { modelName: "Session" }),
      ).toBe(false);
    });

    it("filters by column fragment from error message", () => {
      const error = {
        code: "P2022",
        meta: { modelName: "Session" },
        message: "The column `Session.dropInEnabled` does not exist",
      };

      expect(
        isPrismaSchemaMismatchError(error, {
          modelName: "Session",
          columnFragment: "dropInEnabled",
        }),
      ).toBe(true);
      expect(
        isPrismaSchemaMismatchError(error, {
          modelName: "Session",
          columnFragment: "dropInPrice",
        }),
      ).toBe(false);
    });
  });

  describe("getDatabaseActionErrorMessage", () => {
    it("returns fallback message for transient errors", () => {
      const error = { code: "P1001" };
      const result = getDatabaseActionErrorMessage(error, "Custom fallback");
      expect(result).toBe("Custom fallback");
    });

    it("preserves known error message if requested", () => {
      const error = new Error("Specific business error");
      const result = getDatabaseActionErrorMessage(error, "Fallback", {
        preserveKnownErrorMessage: true,
      });
      expect(result).toBe("Specific business error");
    });

    it("uses fallback if preserveKnownErrorMessage is true but message is empty", () => {
      const result = getDatabaseActionErrorMessage({}, "Fallback", {
        preserveKnownErrorMessage: true,
      });
      expect(result).toBe("Fallback");
    });
  });

  describe("logPrismaError", () => {
    it("logs error with duration if startedAt is provided", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const error = new Error("Test Error");
      error.name = "PrismaClientKnownRequestError";
      
      const startedAt = Date.now() - 100;
      logPrismaError("test.context", error, startedAt);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[test\.context\] Prisma error after \d+ms: PrismaClientKnownRequestError/),
        error
      );
      
      consoleSpy.mockRestore();
    });

    it("logs unknown error for non-Error objects", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      logPrismaError("test.context", "Plain string error");

      expect(consoleSpy).toHaveBeenCalledWith(
        "[test.context] Prisma error: unknown",
        "Plain string error"
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe("logPrismaSchemaWarningOnce", () => {
    it("logs only once for the same context + signature", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const error = { code: "P2021", message: "Table missing" };

      expect(
        logPrismaSchemaWarningOnce("test.context", "drop-in-mismatch", error),
      ).toBe(true);
      expect(
        logPrismaSchemaWarningOnce("test.context", "drop-in-mismatch", error),
      ).toBe(false);

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        "[test.context] Prisma schema drift detected (drop-in-mismatch)",
        error,
      );
    });
  });
});
