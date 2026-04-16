import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  session: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
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

vi.mock("@/lib/email/notifications", () => ({
  sendBestEffortEmails: vi.fn(),
  sendSessionCancellationEmail: vi.fn(),
}));

vi.mock("@/features/auth/get-user", () => ({
  requireUser: requireUserMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

import { createSession } from "@/features/sessions/actions";

describe("createSession", () => {
  beforeEach(() => {
    requireUserMock.mockReset();
    prismaMock.session.create.mockReset();
    redirectMock.mockReset();
    requireUserMock.mockResolvedValue({ id: "admin-1", role: "admin" });
  });

  it("returns a retryable error when the database connection is terminated", async () => {
    prismaMock.session.create.mockRejectedValueOnce(
      new Error("Connection terminated due to connection timeout"),
    );

    const formData = new FormData();
    formData.set("title", "Тестовая сессия");
    formData.set("description", "");
    formData.set("date", "2026-04-15");
    formData.set("startTime", "10:00");
    formData.set("durationMinutes", "60");
    formData.set("capacity", "6");

    await expect(createSession(undefined, formData)).resolves.toMatchObject({
      ok: false,
      error: "Не удалось создать сессию. Попробуйте ещё раз.",
    });
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
