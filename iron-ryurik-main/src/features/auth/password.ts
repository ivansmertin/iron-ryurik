import { getAuthErrorMessage } from "./errors";

type SupabasePasswordClient = {
  auth: {
    resetPasswordForEmail(
      email: string,
      options: {
        redirectTo: string;
      },
    ): Promise<{ error: { message?: string } | null }>;
    updateUser(input: {
      password: string;
    }): Promise<{ error: { message?: string } | null }>;
  };
};

export function buildResetPasswordRedirectUrl(origin: string) {
  return new URL("/reset-password", origin).toString();
}

export async function requestPasswordResetEmail(
  client: SupabasePasswordClient,
  email: string,
  redirectTo: string,
) {
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    return {
      ok: false as const,
      error: getAuthErrorMessage(error),
    };
  }

  return {
    ok: true as const,
  };
}

export async function updatePasswordWithClient(
  client: SupabasePasswordClient,
  password: string,
) {
  const { error } = await client.auth.updateUser({ password });

  if (error) {
    return {
      ok: false as const,
      error: getAuthErrorMessage(error),
    };
  }

  return {
    ok: true as const,
  };
}
