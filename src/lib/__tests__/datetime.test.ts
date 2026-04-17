import { describe, expect, it, vi } from "vitest";
import {
  parseDateInput,
  parseTimeInput,
  createUtcDateFromMoscowDateTime,
  createUtcDateFromMoscowDate,
  addDaysToMoscowDate,
  getMoscowDateTimeParts,
  getMoscowDateInputValue,
  getMoscowTimeInputValue,
  getMoscowDayRange,
  getMoscowDayStartUtc,
  getMoscowCalendarDayDiff,
  getMoscowDateKey,
  getMoscowWeekRange,
  MOSCOW_UTC_OFFSET_MS,
} from "../datetime";

describe("datetime utilities", () => {
  describe("parseDateInput", () => {
    it("parses valid date YYYY-MM-DD", () => {
      expect(parseDateInput("2024-05-20")).toEqual({ year: 2024, month: 5, day: 20 });
    });

    it("returns null for invalid format", () => {
      expect(parseDateInput("20-05-2024")).toBeNull();
      expect(parseDateInput("2024/05/20")).toBeNull();
      expect(parseDateInput("abc")).toBeNull();
    });

    it("returns null for invalid date values", () => {
      expect(parseDateInput("2024-13-01")).toBeNull(); // month 13
      expect(parseDateInput("2024-05-32")).toBeNull(); // day 32
    });
  });

  describe("parseTimeInput", () => {
    it("parses valid time HH:mm", () => {
      expect(parseTimeInput("14:30")).toEqual({ hour: 14, minute: 30 });
    });

    it("returns null for invalid format", () => {
      expect(parseTimeInput("14:3")).toBeNull();
      expect(parseTimeInput("2:30")).toBeNull();
      expect(parseTimeInput("abc")).toBeNull();
    });

    it("returns null for invalid time values", () => {
      expect(parseTimeInput("24:00")).toBeNull();
      expect(parseTimeInput("14:60")).toBeNull();
    });
  });

  describe("createUtcDateFromMoscowDateTime", () => {
    it("creates correct UTC date from Moscow time", () => {
      // 2024-05-20 12:00 Moscow (UTC+3) -> 2024-05-20 09:00 UTC
      const date = createUtcDateFromMoscowDateTime("2024-05-20", "12:00");
      expect(date?.toISOString()).toBe("2024-05-20T09:00:00.000Z");
    });

    it("returns null for invalid inputs", () => {
      expect(createUtcDateFromMoscowDateTime("invalid", "12:00")).toBeNull();
    });
  });

  describe("getMoscowDateTimeParts", () => {
    it("extracts correct parts from UTC date", () => {
      const utcDate = new Date("2024-05-20T09:00:00.000Z");
      const parts = getMoscowDateTimeParts(utcDate);
      expect(parts).toEqual({
        year: 2024,
        month: 5,
        day: 20,
        hour: 12,
        minute: 0,
      });
    });
  });

  describe("getMoscowDayRange", () => {
    it("returns correct start and end of Moscow day", () => {
      const baseDate = new Date("2024-05-20T15:00:00.000Z"); // 18:00 Moscow
      const { start, end } = getMoscowDayRange(baseDate);
      
      // Moscow day starts at 00:00 (21:00 UTC previous day)
      expect(start.toISOString()).toBe("2024-05-19T21:00:00.000Z");
      // Moscow day ends at 00:00 next day (21:00 UTC)
      expect(end.toISOString()).toBe("2024-05-20T21:00:00.000Z");
    });
  });

  describe("getMoscowDayStartUtc", () => {
    it("returns UTC timestamp for the start of the Moscow day", () => {
      const date = new Date("2024-05-20T10:00:00.000Z"); // 13:00 Moscow
      const start = getMoscowDayStartUtc(date);
      expect(start.toISOString()).toBe("2024-05-19T21:00:00.000Z");
    });
  });

  describe("getMoscowCalendarDayDiff", () => {
    it("calculates zero diff for same Moscow day", () => {
      const date1 = new Date("2024-05-20T01:00:00.000Z"); // 04:00 Moscow
      const date2 = new Date("2024-05-20T20:00:00.000Z"); // 23:00 Moscow
      expect(getMoscowCalendarDayDiff(date2, date1)).toBe(0);
    });

    it("calculates positive diff for future day", () => {
      const today = new Date("2024-05-20T12:00:00.000Z"); // Monday
      const tomorrow = new Date("2024-05-21T12:00:00.000Z"); // Tuesday
      expect(getMoscowCalendarDayDiff(tomorrow, today)).toBe(1);
    });

    it("handles boundary around midnight Moscow", () => {
      const lateToday = new Date("2024-05-20T20:59:00.000Z"); // 23:59 Moscow
      const earlyTomorrow = new Date("2024-05-20T21:01:00.000Z"); // 00:01 Moscow
      expect(getMoscowCalendarDayDiff(earlyTomorrow, lateToday)).toBe(1);
    });
  });

  describe("getMoscowDateKey", () => {
    it("returns correct YYYY-MM-DD key for Moscow timezone", () => {
      const date = new Date("2024-05-20T22:00:00.000Z"); // 01:00 May 21 Moscow
      expect(getMoscowDateKey(date)).toBe("2024-05-21");
    });
  });

  describe("getMoscowWeekRange", () => {
    it("returns correct range for current week (Monday to Monday)", () => {
      // 2024-05-22 is Wednesday
      const baseDate = new Date("2024-05-22T10:00:00.000Z"); 
      const { start, end } = getMoscowWeekRange(0, baseDate);
      
      // Monday of that week was May 20
      expect(getMoscowDateKey(start)).toBe("2024-05-20");
      // Next Monday is May 27
      expect(getMoscowDateKey(end)).toBe("2024-05-27");
      
      // Start should be 00:00 Moscow (21:00 UTC previous day)
      expect(start.toISOString()).toBe("2024-05-19T21:00:00.000Z");
    });

    it("handles week offset", () => {
      const baseDate = new Date("2024-05-22T10:00:00.000Z");
      const { start } = getMoscowWeekRange(1, baseDate); // Next week
      expect(getMoscowDateKey(start)).toBe("2024-05-27");
    });
  });
});
