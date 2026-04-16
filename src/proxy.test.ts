import { beforeEach, describe, expect, it, vi } from "vitest";

const createMiddlewareClientMock = vi.hoisted(() => vi.fn());
const getRoleHomeRouteMock = vi.hoisted(() =>
  vi.fn((role?: string) => (role ? `/${role}` : "/client")),
);
const responseMock = vi.hoisted(() => vi.fn(() => "ok"));
const redirectMock = vi.hoisted(() => vi.fn((url: URL) => `redirect:${url.pathname}`));

vi.mock("@/lib/supabase/middleware-client", () => ({
  createMiddlewareClient: createMiddlewareClientMock,
}));

vi.mock("@/features/auth/role", () => ({
  getRoleHomeRoute: getRoleHomeRouteMock,
}));

vi.mock("next/server", () => ({
  NextResponse: {
    redirect: redirectMock,
  },
}));

import { proxy } from "@/proxy";

type MiddlewareUser = {
  id: string;
  user_metadata?: {
    role?: string;
  };
} | null;

function createRequest(pathname: string) {
  return {
    nextUrl: {
      pathname,
      clone: () => new URL(`http://localhost${pathname}`),
    },
  } as never;
}

function mockMiddlewareUser(user: MiddlewareUser) {
  const getUser = vi.fn().mockResolvedValue({
    data: {
      user,
    },
  });

  createMiddlewareClientMock.mockReturnValue({
    supabase: {
      auth: {
        getUser,
      },
    },
    response: responseMock,
  });

  return getUser;
}

describe("proxy auth routing", () => {
  beforeEach(() => {
    createMiddlewareClientMock.mockReset();
    getRoleHomeRouteMock.mockClear();
    responseMock.mockReset();
    redirectMock.mockReset();
    responseMock.mockReturnValue("ok");
  });

  it("refreshes Supabase user and redirects authenticated auth page by metadata role", async () => {
    const getUser = mockMiddlewareUser({
      id: "user-1",
      user_metadata: {
        role: "trainer",
      },
    });

    await expect(proxy(createRequest("/login"))).resolves.toBe("redirect:/trainer");

    expect(getUser).toHaveBeenCalled();
    expect(getRoleHomeRouteMock).toHaveBeenCalledWith("trainer");
  });

  it("redirects anonymous private routes to login", async () => {
    mockMiddlewareUser(null);

    await expect(proxy(createRequest("/admin"))).resolves.toBe("redirect:/login");
    expect(responseMock).not.toHaveBeenCalled();
  });

  it("allows authenticated private routes and leaves role enforcement to layouts", async () => {
    mockMiddlewareUser({
      id: "user-2",
      user_metadata: {
        role: "client",
      },
    });

    await expect(proxy(createRequest("/trainer/slots"))).resolves.toBe("ok");
    expect(responseMock).toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("allows anonymous public routes", async () => {
    mockMiddlewareUser(null);

    await expect(proxy(createRequest("/"))).resolves.toBe("ok");
    expect(responseMock).toHaveBeenCalled();
  });
});
