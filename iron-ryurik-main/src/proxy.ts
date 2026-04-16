import { type NextRequest, NextResponse } from "next/server";
import {
  getCanonicalRoleForUserId,
  getCanonicalRoleWithFallback,
  getRoleHomeRoute,
} from "@/features/auth/role";
import { createMiddlewareClient } from "@/lib/supabase/middleware-client";

const AUTH_REDIRECT_ROUTES = ["/login", "/register", "/forgot-password"];

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
  const { supabase, response } = createMiddlewareClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (user && AUTH_REDIRECT_ROUTES.includes(pathname)) {
    const role = await getCanonicalRoleWithFallback(
      user.id,
      user.user_metadata?.role as string | undefined,
    );
    return redirectTo(request, getRoleHomeRoute(role));
  }

  const isPrivateRoute =
    pathname.startsWith("/client") ||
    pathname.startsWith("/trainer") ||
    pathname.startsWith("/admin");

  if (isPrivateRoute) {
    if (!user) {
      return redirectTo(request, "/login");
    }

    const canonicalRole = await getCanonicalRoleForUserId(user.id);
    if (!canonicalRole) {
      return redirectTo(request, "/login");
    }

    const roleHomeRoute = getRoleHomeRoute(canonicalRole);
    if (!pathname.startsWith(roleHomeRoute)) {
      return redirectTo(request, roleHomeRoute);
    }
  }

  return response();
}

export default proxy;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
