import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const ROLE_ROUTES: Record<string, string> = {
  client: "/client",
  trainer: "/trainer",
  admin: "/admin",
};

export async function requireUser(requiredRole?: string) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: authUser.id },
  });

  if (!dbUser || dbUser.deletedAt) redirect("/login");

  if (requiredRole && dbUser.role !== requiredRole) {
    redirect(ROLE_ROUTES[dbUser.role] || "/client");
  }

  return dbUser;
}
