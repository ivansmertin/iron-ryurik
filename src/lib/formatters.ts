import type {
  BookingStatus,
  MembershipStatus,
  SessionStatus,
  Sport,
} from "@prisma/client";
import {
  getMoscowCalendarDayDiff,
  MOSCOW_TIMEZONE,
} from "@/lib/datetime";

const currencyFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
});

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  timeZone: MOSCOW_TIMEZONE,
  day: "numeric",
  month: "long",
  year: "numeric",
});

const dateShortFormatter = new Intl.DateTimeFormat("ru-RU", {
  timeZone: MOSCOW_TIMEZONE,
  day: "numeric",
  month: "long",
});

const dateTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
  timeZone: MOSCOW_TIMEZONE,
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const timeFormatter = new Intl.DateTimeFormat("ru-RU", {
  timeZone: MOSCOW_TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const dayHeadingFormatter = new Intl.DateTimeFormat("ru-RU", {
  timeZone: MOSCOW_TIMEZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
});

export const sportLabels: Record<Sport, string> = {
  running: "Бег",
  trail: "Трейл",
  triathlon: "Триатлон",
  skiing: "Лыжи",
  other: "Другое",
};

export const sessionStatusLabels: Record<SessionStatus, string> = {
  scheduled: "Запланировано",
  cancelled: "Отменено",
  completed: "Завершено",
};

export const membershipStatusLabels: Record<MembershipStatus, string> = {
  active: "Активен",
  expired: "Истёк",
  cancelled: "Отменён",
  frozen: "Заморожен",
};

export const bookingStatusLabels: Record<BookingStatus, string> = {
  pending: "Забронировано",
  cancelled: "Отменён",
  completed: "Посещение подтверждено",
  no_show: "Неявка",
};

export function formatBookingCancelReason(reason: string | null | undefined) {
  switch (reason) {
    case "client_cancelled":
      return "вы отменили запись";
    case "session_cancelled":
      return "занятие отменено залом";
    default:
      return reason?.trim() || "причина не указана";
  }
}

export function formatMoney(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const amount = typeof value === "number" ? value : Number(value);
  return currencyFormatter.format(amount);
}

export function formatMoscowDate(date: Date | null | undefined) {
  if (!date) {
    return "—";
  }

  return dateFormatter.format(date);
}

export function formatMoscowDateShort(date: Date | null | undefined) {
  if (!date) {
    return "—";
  }

  return dateShortFormatter.format(date);
}

export function formatMoscowDateTime(date: Date | null | undefined) {
  if (!date) {
    return "—";
  }

  const parts = dateTimeFormatter.formatToParts(date);
  const getValue = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${getValue("day")} ${getValue("month")}, ${getValue("hour")}:${getValue("minute")}`;
}

export function formatMoscowRelativeDateTime(
  date: Date | null | undefined,
  baseDate = new Date(),
) {
  if (!date) {
    return "—";
  }

  const dayDiff = getMoscowCalendarDayDiff(date, baseDate);
  const time = timeFormatter.format(date);

  if (dayDiff === 0) {
    return `сегодня в ${time}`;
  }

  if (dayDiff === 1) {
    return `завтра в ${time}`;
  }

  if (dayDiff === 2) {
    return `послезавтра в ${time}`;
  }

  const heading = dayHeadingFormatter.format(date);
  return `${heading.charAt(0).toUpperCase()}${heading.slice(1)} в ${time}`;
}

export function formatMoscowDayHeading(date: Date | null | undefined) {
  if (!date) {
    return "—";
  }

  const heading = dayHeadingFormatter.format(date);
  return `${heading.charAt(0).toUpperCase()}${heading.slice(1)}`;
}

export function formatMoscowTime(date: Date | null | undefined) {
  if (!date) {
    return "—";
  }

  return timeFormatter.format(date);
}

export function formatSport(sport: Sport | null | undefined) {
  if (!sport) {
    return "—";
  }

  return sportLabels[sport];
}
