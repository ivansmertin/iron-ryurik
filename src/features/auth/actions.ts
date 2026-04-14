"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, registerSchema } from "./schemas";

type ActionResult = { error: string } | undefined;

const ROLE_ROUTES: Record<string, string> = {
  client: "/client",
  trainer: "/trainer",
  admin: "/admin",
};

function mapSupabaseErrorMessage(error: { message?: string } | null) {
  if (!error?.message) {
    return "Неизвестная ошибка авторизации";
  }

  if (error.message === "fetch failed") {
    return "Не удалось подключиться к Supabase Auth. Проверьте сеть, DNS, VPN или доступ к домену проекта.";
  }

  return error.message;
}

export async function signIn(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const raw = Object.fromEntries(formData);
  const parsed = loginSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  console.log("[signIn] input:", parsed.data);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  console.log("[signIn] supabase response:", { data, error });

  if (error) {
    console.error("[signIn] supabase error:", error);
    return { error: mapSupabaseErrorMessage(error) };
  }

  const role = (data.user.user_metadata?.role as string) || "client";
  redirect(ROLE_ROUTES[role] || "/client");
}

export async function signUp(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const raw = {
    ...Object.fromEntries(formData),
    acceptRules: formData.get("acceptRules") === "on",
  };
  const parsed = registerSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  console.log("[signUp] input:", parsed.data);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
        role: "client",
        sport: parsed.data.sport,
      },
    },
  });

  console.log("[signUp] supabase response:", { data, error });

  if (error) {
    console.error("[signUp] supabase error:", error);
    return { error: mapSupabaseErrorMessage(error) };
  }

  if (!data.session) {
    return { error: "Регистрация успешна. Проверьте email для подтверждения." };
  }

  redirect("/client");
}
