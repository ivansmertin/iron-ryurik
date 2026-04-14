import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const ROLE_ROUTES: Record<string, string> = {
  client: "/client",
  trainer: "/trainer",
  admin: "/admin",
};

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const role = (user.user_metadata?.role as string) || "client";
    redirect(ROLE_ROUTES[role] || "/client");
  }

  redirect("/login");
}
