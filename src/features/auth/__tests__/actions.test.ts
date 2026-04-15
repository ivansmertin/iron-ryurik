import { beforeEach, describe, expect, it, vi } from "vitest";

const createClientMock = vi.hoisted(() => vi.fn());
const redirectMock = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
);
const getCanonicalRoleWithFallbackMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/features/auth/role", () => ({
  getCanonicalRoleWithFallback: getCanonicalRoleWithFallbackMock,
  getRoleHomeRoute: vi.fn((role: string) => `/${role}`),
}));

import { signIn, signUp } from "@/features/auth/actions";

describe("auth actions hardening", () => {
  beforeEach(() => {
    createClientMock.mockReset();
    redirectMock.mockReset();
    getCanonicalRoleWithFallbackMock.mockReset();
  });

  it("signIn не логирует чувствительные данные и редиректит по канонической роли", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const signInWithPassword = vi.fn().mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          user_metadata: { role: "client" },
        },
      },
      error: null,
    });

    createClientMock.mockResolvedValue({
      auth: {
        signInWithPassword,
      },
    });
    getCanonicalRoleWithFallbackMock.mockResolvedValue("trainer");

    const formData = new FormData();
    formData.set("email", "trainer@example.com");
    formData.set("password", "super-secret");

    await expect(signIn(undefined, formData)).rejects.toThrow("redirect:/trainer");
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "trainer@example.com",
      password: "super-secret",
    });
    expect(getCanonicalRoleWithFallbackMock).toHaveBeenCalledWith(
      "user-1",
      "client",
    );
    expect(logSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("signUp сохраняет текущий flow подтверждения email", async () => {
    createClientMock.mockResolvedValue({
      auth: {
        signUp: vi.fn().mockResolvedValue({
          data: { session: null, user: { id: "new-user", user_metadata: null } },
          error: null,
        }),
      },
    });

    const formData = new FormData();
    formData.set("fullName", "Новый Клиент");
    formData.set("email", "new-client@example.com");
    formData.set("password", "secret123");
    formData.set("passwordConfirm", "secret123");
    formData.set("sport", "running");
    formData.set("acceptRules", "on");

    await expect(signUp(undefined, formData)).resolves.toEqual({
      error: "Регистрация успешна. Проверьте email для подтверждения.",
    });
  });
});
