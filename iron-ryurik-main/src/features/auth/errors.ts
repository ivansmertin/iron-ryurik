const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "fetch failed":
    "Не удалось подключиться к Supabase Auth. Проверьте сеть, DNS, VPN или доступ к домену проекта.",
  "Auth session missing":
    "Ссылка устарела или недействительна. Запросите новое письмо для восстановления пароля.",
  "Session from session_id claim in JWT is not valid":
    "Ссылка устарела или недействительна. Запросите новое письмо для восстановления пароля.",
};

export function getAuthErrorMessage(
  error: { message?: string } | null | undefined,
  fallback = "Неизвестная ошибка авторизации",
) {
  const message = error?.message?.trim();

  if (!message) {
    return fallback;
  }

  return AUTH_ERROR_MESSAGES[message] ?? message;
}
