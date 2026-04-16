import { redirect } from "next/navigation";
import { getRoleHomeRoute } from "@/features/auth/role";
import { withPrismaReadRetry } from "@/lib/prisma-read";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function requireUser(requiredRole?: string) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

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
