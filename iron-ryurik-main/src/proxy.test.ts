import { beforeEach, describe, expect, it, vi } from "vitest";

const createMiddlewareClientMock = vi.hoisted(() => vi.fn());
const getCanonicalRoleForUserIdMock = vi.hoisted(() => vi.fn());
const getCanonicalRoleWithFallbackMock = vi.hoisted(() => vi.fn());
const responseMock = vi.hoisted(() => vi.fn(() => "ok"));
const redirectMock = vi.hoisted(() => vi.fn((url: URL) => `redirect:${url.pathname}`));

vi.mock("@/lib/supabase/middleware-client", () => ({
  createMiddlewareClient: createMiddlewareClientMock,
}));

vi.mock("@/features/auth/role", () => ({
  getCanonicalRoleForUserId: getCanonicalRoleForUserIdMock,
  getCanonicalRoleWithFallback: getCanonicalRoleWithFallbackMock,
  getRoleHomeRoute: vi.fn((role: string) => `/${role}`),
}));

vi.mock("next/server", () => ({
  NextResponse: {
    redirect: redirectMock,
  },
}));

import { proxy } from "@/proxy";

function createRequest(pathname: string) {
  return {
    nextUrl: {
      pathname,
      clone: () => new URL(`http://localhost${pathname}`),
    },
  } as never;
}

describe("proxy role consistency", () => {
  beforeEach(() => {
    createMiddlewareClientMock.mockReset();
    getCanonicalRoleForUserIdMock.mockReset();
    getCanonicalRoleWithFallbackMock.mockReset();
    responseMock.mockReset();
    redirectMock.mockReset();
    responseMock.mockReturnValue("ok");
  });

  it("редиректит с auth-страниц по канонической роли из базы", async () => {
    createMiddlewareClientMock.mockReturnValue({
      supabase: {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: { id: "user-1", user_metadata: { role: "trainer" } },
            },
          }),
        },
      },
      response: responseMock,
    });
    getCanonicalRoleWithFallbackMock.mockResolvedValue("admin");

    await expect(proxy(createRequest("/login"))).resolves.toBe("redirect:/admin");
    expect(getCanonicalRoleWithFallbackMock).toHaveBeenCalledWith(
      "user-1",
      "trainer",
    );
  });

  it("редиректит на канонический раздел при несовпадении приватного префикса", async () => {
    createMiddlewareClientMock.mockReturnValue({
      supabase: {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "user-2", user_metadata: { role: "admin" } } },
          }),
        },
      },
      response: responseMock,
    });
    getCanonicalRoleForUserIdMock.mockResolvedValue("client");

    await expect(proxy(createRequest("/trainer/slots"))).resolves.toBe(
      "redirect:/client",
    );
  });

  it("пускает в private route при совпадающей канонической роли", async () => {
    createMiddlewareClientMock.mockReturnValue({
      supabase: {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "user-3", user_metadata: { role: "client" } } },
          }),
        },
      },
      response: responseMock,
    });
    getCanonicalRoleForUserIdMock.mockResolvedValue("client");

    await expect(proxy(createRequest("/client/schedule"))).resolves.toBe("ok");
    expect(responseMock).toHaveBeenCalled();
  });
});
