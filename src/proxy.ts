import { type NextRequest, NextResponse } from "next/server";
import { getRoleHomeRoute } from "@/features/auth/role";
import { createMiddlewareClient } from "@/lib/supabase/middleware-client";

const AUTH_REDIRECT_ROUTES = ["/login", "/register", "/forgot-password"];

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
  const { supabase, response } = createMiddlewareClient(request);

  // This call is required to refresh the session cookie — Supabase SSR pattern.
  // We intentionally avoid DB queries in middleware for performance. Role checks
  // and authorization are handled by requireUser() in each layout/page.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Logged-in users visiting auth pages → redirect to their role's home.
  // Use JWT claim (user_metadata.role) to avoid a DB query here.
  if (user && AUTH_REDIRECT_ROUTES.includes(pathname)) {
    const role = user.user_metadata?.role as string | undefined;
    return redirectTo(request, getRoleHomeRoute(role));
  }

  const isPrivateRoute =
    pathname.startsWith("/client") ||
    pathname.startsWith("/trainer") ||
    pathname.startsWith("/admin");

  // Not authenticated → send to login.
  // If authenticated but wrong role → requireUser() in the layout will redirect.
  if (isPrivateRoute && !user) {
    return redirectTo(request, "/login");
  }

  return response();
}

export default proxy;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
