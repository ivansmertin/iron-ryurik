import { describe, expect, it, vi } from "vitest";
import {
  buildResetPasswordRedirectUrl,
  requestPasswordResetEmail,
  updatePasswordWithClient,
} from "@/features/auth/password";

describe("auth password helpers", () => {
  it("строит абсолютный redirectTo для восстановления пароля", () => {
    expect(buildResetPasswordRedirectUrl("http://localhost:3000")).toBe(
      "http://localhost:3000/reset-password",
    );
  });

  it("успешно запрашивает письмо для сброса пароля", async () => {
    const client = {
      auth: {
        resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
        updateUser: vi.fn(),
      },
    };

    await expect(
      requestPasswordResetEmail(
        client as never,
        "client@example.com",
        "http://localhost:3000/reset-password",
      ),
    ).resolves.toEqual({ ok: true });

    expect(client.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      "client@example.com",
      {
        redirectTo: "http://localhost:3000/reset-password",
      },
    );
  });

  it("переводит ошибку Supabase в понятное сообщение", async () => {
    const client = {
      auth: {
        resetPasswordForEmail: vi.fn().mockResolvedValue({
          error: {
            message: "Auth session missing",
          },
        }),
        updateUser: vi.fn(),
      },
    };

    await expect(
      requestPasswordResetEmail(
        client as never,
        "client@example.com",
        "http://localhost:3000/reset-password",
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: expect.stringContaining("Ссылка устарела"),
    });
  });

  it("обновляет пароль текущего пользователя", async () => {
    const client = {
      auth: {
        resetPasswordForEmail: vi.fn(),
        updateUser: vi.fn().mockResolvedValue({ error: null }),
      },
    };

    await expect(
      updatePasswordWithClient(client as never, "new-password-123"),
    ).resolves.toEqual({ ok: true });

    expect(client.auth.updateUser).toHaveBeenCalledWith({
      password: "new-password-123",
    });
  });
});
