import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { getRoleHomeRoute } from "@/features/auth/role";
import { withPrismaReadRetry } from "@/lib/prisma-read";
import { getCachedSupabaseUser } from "@/lib/supabase/cached-user";
import { prisma } from "@/lib/prisma";

export async function requireUser(requiredRole?: string) {
  const authUser = await getCachedSupabaseUser();

  if (!authUser) redirect("/login");

  const dbUser = await withPrismaReadRetry(
    () =>
      prisma.user.findUnique({
        where: { id: authUser.id },
      }),
    2,
    "auth.requireUser",
  );

  if (!dbUser || dbUser.deletedAt) redirect("/login");

  if (requiredRole && dbUser.role !== requiredRole) {
    redirect(getRoleHomeRoute(dbUser.role));
  }

  return dbUser;
}

export async function requireUserRole(requiredRoles: UserRole[]) {
  const user = await requireUser();

  if (!requiredRoles.includes(user.role)) {
    redirect(getRoleHomeRoute(user.role));
  }

  return user;
}
