import { redirect } from "next/navigation";
import {
  getCanonicalRoleWithFallback,
  getRoleHomeRoute,
} from "@/features/auth/role";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const role = await getCanonicalRoleWithFallback(
      user.id,
      user.user_metadata?.role as string | undefined,
    );
    redirect(getRoleHomeRoute(role));
  }

  redirect("/login");
}
