import { describe, expect, it, vi } from "vitest";
import { withPrismaReadRetry } from "@/lib/prisma-read";

describe("withPrismaReadRetry", () => {
  it("retries transient connection errors once", async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(
        new Error("Connection terminated due to connection timeout"),
      )
      .mockResolvedValueOnce("ok");

    await expect(withPrismaReadRetry(operation)).resolves.toBe("ok");
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("retries transient query timeout errors", async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error("Query read timeout"))
      .mockResolvedValueOnce("ok");

    await expect(withPrismaReadRetry(operation)).resolves.toBe("ok");
    expect(operation).toHaveBeenCalledTimes(2);
  });
});
