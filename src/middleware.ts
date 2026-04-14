import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/login", "/register"];
const ROLE_ROUTES: Record<string, string> = {
  client: "/client",
  trainer: "/trainer",
  admin: "/admin",
};

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Авторизованный пользователь на /login или /register → редирект по роли
  if (user && PUBLIC_ROUTES.includes(pathname)) {
    const role = (user.user_metadata?.role as string) || "client";
    const redirectTo = ROLE_ROUTES[role] || "/client";
    const url = request.nextUrl.clone();
    url.pathname = redirectTo;
    return NextResponse.redirect(url);
  }

  // Неавторизованный на приватных роутах → /login
  const isPrivateRoute =
    pathname.startsWith("/client") ||
    pathname.startsWith("/trainer") ||
    pathname.startsWith("/admin");

  if (!user && isPrivateRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
