import { describe, expect, it } from "vitest";
import { isTransientPrismaConnectionError } from "@/lib/prisma-errors";

describe("isTransientPrismaConnectionError", () => {
  it("recognizes connection timeout messages", () => {
    expect(
      isTransientPrismaConnectionError(
        new Error("Connection terminated due to connection timeout"),
      ),
    ).toBe(true);
  });

  it("recognizes prisma timeout codes", () => {
    expect(
      isTransientPrismaConnectionError({
        code: "P2024",
        message: "Timed out fetching a new connection from the connection pool",
      }),
    ).toBe(true);
  });

  it("ignores unrelated errors", () => {
    expect(isTransientPrismaConnectionError(new Error("Validation failed"))).toBe(
      false,
    );
  });
});
