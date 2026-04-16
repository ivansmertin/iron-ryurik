export const MOSCOW_TIMEZONE = "Europe/Moscow";
export const MOSCOW_UTC_OFFSET_MINUTES = 180;
export const MOSCOW_UTC_OFFSET_MS = MOSCOW_UTC_OFFSET_MINUTES * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

type MoscowDateParts = {
  year: number;
  month: number;
  day: number;
};

type MoscowDateTimeParts = MoscowDateParts & {
  hour: number;
  minute: number;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function parseDateInput(value: string): MoscowDateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  return { year, month, day };
}

export function parseTimeInput(
  value: string,
): Pick<MoscowDateTimeParts, "hour" | "minute"> | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return { hour, minute };
}

export function createUtcDateFromMoscowDateTime(
  date: string,
  time: string,
): Date | null {
  const dateParts = parseDateInput(date);
  const timeParts = parseTimeInput(time);

  if (!dateParts || !timeParts) {
    return null;
  }

  return new Date(
    Date.UTC(
      dateParts.year,
      dateParts.month - 1,
      dateParts.day,
      timeParts.hour,
      timeParts.minute,
    ) - MOSCOW_UTC_OFFSET_MS,
  );
}

export function createUtcDateFromMoscowDate(date: string): Date | null {
  const dateParts = parseDateInput(date);

  if (!dateParts) {
    return null;
  }

  return new Date(
    Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day) -
      MOSCOW_UTC_OFFSET_MS,
  );
}

export function addDaysToMoscowDate(date: string, days: number): Date | null {
  const dateParts = parseDateInput(date);

  if (!dateParts) {
    return null;
  }

  return new Date(
    Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day + days) -
      MOSCOW_UTC_OFFSET_MS,
  );
}

export function getMoscowDateTimeParts(date: Date): MoscowDateTimeParts {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: MOSCOW_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);

  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day"),
    hour: getPart("hour"),
    minute: getPart("minute"),
  };
}

export function getMoscowDateInputValue(date: Date): string {
  const parts = getMoscowDateTimeParts(date);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function getMoscowTimeInputValue(date: Date): string {
  const parts = getMoscowDateTimeParts(date);
  return `${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function getMoscowDayRange(baseDate = new Date()) {
  const parts = getMoscowDateTimeParts(baseDate);
  const dateValue = `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
  const start = createUtcDateFromMoscowDateTime(dateValue, "00:00");
  const end = createUtcDateFromMoscowDateTime(
    getMoscowDateInputValue(new Date(baseDate.getTime() + 24 * 60 * 60 * 1000)),
    "00:00",
  );

  if (!start || !end) {
    throw new Error("Не удалось рассчитать границы московского дня.");
  }

  return { start, end };
}

export function getDaysFromNowRange(days: number, baseDate = new Date()) {
  return {
    start: baseDate,
    end: new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000),
  };
}

export function getMoscowDayStartUtc(baseDate = new Date()) {
  const shifted = new Date(baseDate.getTime() + MOSCOW_UTC_OFFSET_MS);

  return new Date(
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate(),
    ) - MOSCOW_UTC_OFFSET_MS,
  );
}

export function getMoscowCalendarDayDiff(date: Date, baseDate = new Date()) {
  const dayIndex = (value: Date) =>
    Math.floor(getMoscowDayStartUtc(value).getTime() / DAY_MS);

  return dayIndex(date) - dayIndex(baseDate);
}

export function getMoscowDateKey(date: Date) {
  const shifted = new Date(date.getTime() + MOSCOW_UTC_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shifted.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getMoscowWeekRange(weekOffset = 0, baseDate = new Date()) {
  const baseDayStart = getMoscowDayStartUtc(baseDate);
  const shifted = new Date(baseDate.getTime() + MOSCOW_UTC_OFFSET_MS);
  const weekday = shifted.getUTCDay();
  const mondayOffset = (weekday + 6) % 7;
  const start = new Date(
    baseDayStart.getTime() -
      mondayOffset * DAY_MS +
      weekOffset * 7 * DAY_MS,
  );
  const end = new Date(start.getTime() + 7 * DAY_MS);

  return { start, end };
}
