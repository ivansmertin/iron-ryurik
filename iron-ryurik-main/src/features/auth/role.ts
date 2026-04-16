import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const ROLE_ROUTES: Record<UserRole, string> = {
  client: "/client",
  trainer: "/trainer",
  admin: "/admin",
};

export function normalizeRole(role: string | null | undefined): UserRole | null {
  if (role === "client" || role === "trainer" || role === "admin") {
    return role;
  }

  return null;
}

export function getRoleHomeRoute(role: string | null | undefined): string {
  const normalizedRole = normalizeRole(role);
  return normalizedRole ? ROLE_ROUTES[normalizedRole] : ROLE_ROUTES.client;
}

export async function getCanonicalRoleForUserId(userId: string) {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, deletedAt: true },
  });

  if (!dbUser || dbUser.deletedAt) {
    return null;
  }

  return dbUser.role;
}

export async function getCanonicalRoleWithFallback(
  userId: string,
  fallbackRole: string | null | undefined,
) {
  const canonicalRole = await getCanonicalRoleForUserId(userId);
  if (canonicalRole) {
    return canonicalRole;
  }

  const normalizedFallbackRole = normalizeRole(fallbackRole);
  if (normalizedFallbackRole) {
    return normalizedFallbackRole;
  }

  return "client" as const;
}
