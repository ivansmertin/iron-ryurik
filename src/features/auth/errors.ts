const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "fetch failed":
    "Не удалось подключиться к Supabase Auth. Проверьте сеть, DNS, VPN или доступ к домену проекта.",
  "Auth session missing":
    "Ссылка устарела или недействительна. Запросите новое письмо для восстановления пароля.",
  "Session from session_id claim in JWT is not valid":
    "Ссылка устарела или недействительна. Запросите новое письмо для восстановления пароля.",
  // Обработка Rate Limits (Supabase Auth built-in)
  "Too many requests":
    "Слишком много попыток. Из соображений безопасности подождите несколько минут перед следующей попыткой.",
  "over_email_send_rate_limit":
    "Превышен лимит отправки писем. Пожалуйста, подождите 1 час перед тем, как запросить письмо снова.",
  "rate_limit_exceeded":
    "Превышен лимит запросов к серверу. Попробуйте позже.",
  "over_request_rate_limit":
    "Слишком много запросов. Попробуйте снова чуть позже.",
  "Invalid login credentials":
    "Неверный email или пароль.",
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
