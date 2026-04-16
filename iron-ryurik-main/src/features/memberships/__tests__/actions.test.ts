import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  membershipPlan: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  user: {
    findFirst: vi.fn(),
  },
  $transaction: vi.fn(),
}));

const requireUserMock = vi.hoisted(() => vi.fn());
const redirectMock = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("redirect should not be called in error cases");
  }),
);

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/features/auth/get-user", () => ({
  requireUser: requireUserMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

import { createMembershipPlan } from "@/features/memberships/actions";

describe("createMembershipPlan", () => {
  beforeEach(() => {
    requireUserMock.mockReset();
    prismaMock.membershipPlan.create.mockReset();
    redirectMock.mockReset();
    requireUserMock.mockResolvedValue({ id: "admin-1", role: "admin" });
  });

  it("returns a retryable error when the database connection is terminated", async () => {
    prismaMock.membershipPlan.create.mockRejectedValueOnce(
      new Error("Connection terminated due to connection timeout"),
    );

    const formData = new FormData();
    formData.set("name", "8 занятий");
    formData.set("visits", "8");
    formData.set("durationDays", "30");
    formData.set("price", "2300");
    formData.set("isActive", "on");

    await expect(createMembershipPlan(undefined, formData)).resolves.toMatchObject(
      {
        ok: false,
        error: "Не удалось создать план. Попробуйте ещё раз.",
      },
    );
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
