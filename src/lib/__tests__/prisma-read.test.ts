import { describe, it, expect, vi, beforeEach } from "vitest";
import { withPrismaReadRetry } from "../prisma-read";
import * as errors from "../prisma-errors";

vi.mock("../prisma-errors", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../prisma-errors")>();
  return {
    ...actual,
    logPrismaError: vi.fn(),
  };
});

describe("Prisma Read Retry Utility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns result immediately on success", async () => {
    const operation = vi.fn().mockResolvedValue("success");
    const result = await withPrismaReadRetry(operation);

    expect(result).toBe("success");
    expect(operation).toHaveBeenCalledTimes(1);
    expect(errors.logPrismaError).not.toHaveBeenCalled();
  });

  it("retries on transient error and succeeds", async () => {
    const transientError = { code: "P1001", message: "Connection error" };
    const operation = vi.fn()
      .mockRejectedValueOnce(transientError)
      .mockResolvedValueOnce("success_after_retry");

    const result = await withPrismaReadRetry(operation, 1);

    expect(result).toBe("success_after_retry");
    expect(operation).toHaveBeenCalledTimes(2);
    expect(errors.logPrismaError).not.toHaveBeenCalled();
  });

  it("throws after exhausting retries", async () => {
    const transientError = { code: "P1001", message: "Connection error" };
    const operation = vi.fn().mockRejectedValue(transientError);

    await expect(withPrismaReadRetry(operation, 2)).rejects.toEqual(transientError);
    
    expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    expect(errors.logPrismaError).toHaveBeenCalled();
  });

  it("throws immediately on non-transient error", async () => {
    const fatalError = new Error("Fatal error");
    const operation = vi.fn().mockRejectedValue(fatalError);

    await expect(withPrismaReadRetry(operation)).rejects.toThrow("Fatal error");
    
    expect(operation).toHaveBeenCalledTimes(1); // No retries
    expect(errors.logPrismaError).toHaveBeenCalled();
  });
});
