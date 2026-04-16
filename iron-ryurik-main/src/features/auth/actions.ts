"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthErrorMessage } from "@/features/auth/errors";
import {
  buildResetPasswordRedirectUrl,
  requestPasswordResetEmail,
} from "@/features/auth/password";
import { getCanonicalRoleWithFallback, getRoleHomeRoute } from "@/features/auth/role";
import { createClient } from "@/lib/supabase/server";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
} from "./schemas";

type ActionResult = { error: string } | undefined;
export type PasswordResetRequestState =
  | {
      ok: true;
      message: string;
    }
  | {
      ok: false;
      error: string;
    }
  | undefined;

function mapSupabaseErrorMessage(error: { message?: string } | null) {
  return getAuthErrorMessage(error);
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

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: mapSupabaseErrorMessage(error) };
  }

  if (!data.user) {
    return { error: "Не удалось получить профиль пользователя после входа." };
  }

  const role = await getCanonicalRoleWithFallback(
    data.user.id,
    data.user.user_metadata?.role as string | undefined,
  );
  redirect(getRoleHomeRoute(role));
}

export async function signOut(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
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

  if (error) {
    return { error: mapSupabaseErrorMessage(error) };
  }

  if (!data.session) {
    return { error: "Регистрация успешна. Проверьте email для подтверждения." };
  }

  if (!data.user) {
    return { error: "Не удалось получить профиль пользователя после регистрации." };
  }

  const role = await getCanonicalRoleWithFallback(
    data.user.id,
    data.user.user_metadata?.role as string | undefined,
  );
  redirect(getRoleHomeRoute(role));
}

export async function requestPasswordReset(
  _prev: PasswordResetRequestState,
  formData: FormData,
): Promise<PasswordResetRequestState> {
  const raw = Object.fromEntries(formData);
  const parsed = forgotPasswordSchema.safeParse(raw);

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const headersList = await headers();
  const origin =
    headersList.get("origin") ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";
  const redirectTo = buildResetPasswordRedirectUrl(origin);

  const result = await requestPasswordResetEmail(
    supabase,
    parsed.data.email,
    redirectTo,
  );

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return {
    ok: true,
    message:
      "Если адрес существует, мы отправили письмо со ссылкой для восстановления пароля.",
  };
}
