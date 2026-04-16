import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import {
  getCanonicalRoleForUserId,
  getCanonicalRoleWithFallback,
  getRoleHomeRoute,
  normalizeRole,
} from "@/features/auth/role";

describe("auth role helpers", () => {
  beforeEach(() => {
    prismaMock.user.findUnique.mockReset();
  });

  it("нормализует роль и возвращает корректный home route", () => {
    expect(normalizeRole("admin")).toBe("admin");
    expect(normalizeRole("unknown")).toBeNull();
    expect(getRoleHomeRoute("trainer")).toBe("/trainer");
    expect(getRoleHomeRoute("unknown")).toBe("/client");
  });

  it("берёт каноническую роль из базы и игнорирует fallback", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      role: "admin",
      deletedAt: null,
    });

    await expect(
      getCanonicalRoleWithFallback("user-1", "client"),
    ).resolves.toBe("admin");
  });

  it("не возвращает роль для удалённого пользователя", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      role: "trainer",
      deletedAt: new Date(),
    });

    await expect(getCanonicalRoleForUserId("user-2")).resolves.toBeNull();
  });
});
