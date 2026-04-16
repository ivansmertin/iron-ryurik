import { sendEmail } from "./index";
import {
  formatMoscowDateTime,
  formatMoscowTime,
} from "@/lib/formatters";

type SessionNotificationInput = {
  to: string;
  fullName: string;
  sessionTitle: string | null;
  startsAt: Date;
  durationMinutes: number;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatSessionTitle(sessionTitle: string | null) {
  return sessionTitle?.trim() || "занятие";
}

function emailShell({
  title,
  intro,
  details,
  footer,
}: {
  title: string;
  intro: string;
  details: string[];
  footer: string;
}) {
  return `<!doctype html>
<html lang="ru">
  <body style="margin:0;background:#f6f5f2;padding:24px;font-family:Arial,sans-serif;color:#111827;">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:20px;padding:28px;">
      <p style="margin:0 0 12px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">Железный Рюрик</p>
      <h1 style="margin:0 0 16px;font-size:24px;line-height:1.2;">${escapeHtml(title)}</h1>
      <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#374151;">${escapeHtml(intro)}</p>
      <div style="margin:0 0 20px;padding:16px 18px;border-radius:16px;background:#f9fafb;border:1px solid #e5e7eb;">
        ${details
          .map(
            (item) =>
              `<p style="margin:0 0 8px;font-size:15px;line-height:1.5;color:#111827;">${item}</p>`,
          )
          .join("")}
      </div>
      <p style="margin:0;font-size:14px;line-height:1.6;color:#6b7280;">${escapeHtml(footer)}</p>
    </div>
  </body>
</html>`;
}

function sessionDetailsList({
  sessionTitle,
  startsAt,
  durationMinutes,
  includeTime,
}: SessionNotificationInput & {
  includeTime?: boolean;
}) {
  const title = formatSessionTitle(sessionTitle);
  const timeLine = includeTime
    ? `Время начала: ${formatMoscowDateTime(startsAt)}`
    : `Время начала: ${formatMoscowTime(startsAt)}`;

  return [
    `Занятие: <strong>${escapeHtml(title)}</strong>`,
    timeLine,
    `Длительность: ${durationMinutes} мин`,
  ];
}

export async function sendBookingConfirmationEmail(
  input: SessionNotificationInput,
) {
  await sendEmail({
    to: input.to,
    subject: `Запись подтверждена: ${formatSessionTitle(input.sessionTitle)}`,
    html: emailShell({
      title: "Запись подтверждена",
      intro: `Здравствуйте, ${input.fullName}! Вы успешно записаны на занятие.`,
      details: sessionDetailsList({
        ...input,
        includeTime: true,
      }),
      footer:
        "Если планы изменятся, отменить запись можно в личном кабинете до срока, указанного в правилах зала.",
    }),
  });
}

export async function sendBookingCancellationEmail(
  input: SessionNotificationInput & {
    membershipRestored: boolean;
  },
) {
  await sendEmail({
    to: input.to,
    subject: `Запись отменена: ${formatSessionTitle(input.sessionTitle)}`,
    html: emailShell({
      title: "Запись отменена",
      intro: `Здравствуйте, ${input.fullName}! Ваша запись на занятие отменена.`,
      details: [
        ...sessionDetailsList({
          ...input,
          includeTime: true,
        }),
        input.membershipRestored
          ? "Один визит возвращён на абонемент."
          : "Визит не возвращён, потому что абонемент уже неактивен.",
      ],
      footer: "Если отмена была ошибочной, запишитесь на другое удобное занятие.",
    }),
  });
}

export async function sendSessionCancellationEmail(
  input: SessionNotificationInput,
) {
  await sendEmail({
    to: input.to,
    subject: `Занятие отменено: ${formatSessionTitle(input.sessionTitle)}`,
    html: emailShell({
      title: "Занятие отменено",
      intro: `Здравствуйте, ${input.fullName}! Мы отменили занятие, на которое вы были записаны.`,
      details: [
        ...sessionDetailsList({
          ...input,
          includeTime: true,
        }),
        "Визит возвращён на абонемент автоматически.",
      ],
      footer: "Пожалуйста, выберите другое занятие в расписании, когда будете готовы.",
    }),
  });
}

export async function sendBestEffortEmails(
  tasks: Promise<unknown>[],
  context: string,
) {
  const results = await Promise.allSettled(tasks);

  for (const result of results) {
    if (result.status === "rejected") {
      console.error(`[${context}] email notification failed`, result.reason);
    }
  }
}
