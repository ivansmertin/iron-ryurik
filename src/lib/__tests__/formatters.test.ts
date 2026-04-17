import { describe, expect, it, vi } from "vitest";
import {
  formatBookingCancelReason,
  formatMoney,
  formatMoscowDate,
  formatMoscowDateShort,
  formatMoscowDateTime,
  formatMoscowRelativeDateTime,
  formatSport,
} from "../formatters";

describe("formatters", () => {
  describe("formatBookingCancelReason", () => {
    it("shows client cancellation in user-facing wording", () => {
      expect(formatBookingCancelReason("client_cancelled")).toBe("вы отменили запись");
    });

    it("shows gym cancellation in user-facing wording", () => {
      expect(formatBookingCancelReason("session_cancelled")).toBe(
        "занятие отменено залом",
      );
    });

    it("returns default message if reason is unknown or null", () => {
      expect(formatBookingCancelReason(null)).toBe("причина не указана");
      expect(formatBookingCancelReason("Other reason")).toBe("Other reason");
    });
  });

  describe("formatMoney", () => {
    it("formats number as RUB currency", () => {
      const result = formatMoney(1500).replace(/\u00A0/g, " "); // Replace non-breaking spaces
      expect(result).toMatch(/1\s?500,00\s?₽/);
    });

    it("handles zero", () => {
      const result = formatMoney(0).replace(/\u00A0/g, " ");
      expect(result).toMatch(/0,00\s?₽/);
    });

    it("returns dash for null/undefined/empty", () => {
      expect(formatMoney(null)).toBe("—");
      expect(formatMoney(undefined)).toBe("—");
      expect(formatMoney("")).toBe("—");
    });
  });

  describe("formatMoscowDate", () => {
    it("formats date in long Russian format", () => {
      const date = new Date("2024-05-20T10:00:00.000Z");
      expect(formatMoscowDate(date)).toBe("20 мая 2024 г.");
    });

    it("returns dash for null", () => {
      expect(formatMoscowDate(null)).toBe("—");
    });
  });

  describe("formatMoscowDateTime", () => {
    it("formats date and time accurately for Moscow", () => {
      const date = new Date("2024-05-20T09:30:00.000Z"); // 12:30 Moscow
      // Expected: "20 мая, 12:30"
      expect(formatMoscowDateTime(date)).toBe("20 мая, 12:30");
    });
  });

  describe("formatMoscowRelativeDateTime", () => {
    it("returns 'сегодня' for current day", () => {
      const baseDate = new Date("2024-05-20T10:00:00.000Z");
      const testDate = new Date("2024-05-20T15:00:00.000Z"); // Same day
      expect(formatMoscowRelativeDateTime(testDate, baseDate)).toBe("сегодня в 18:00");
    });

    it("returns 'завтра' for next day", () => {
      const baseDate = new Date("2024-05-20T10:00:00.000Z");
      const testDate = new Date("2024-05-21T10:00:00.000Z");
      expect(formatMoscowRelativeDateTime(testDate, baseDate)).toBe("завтра в 13:00");
    });

    it("returns full date for further days", () => {
      const baseDate = new Date("2024-05-20T10:00:00.000Z");
      const testDate = new Date("2024-05-25T10:00:00.000Z");
      // "суббота, 25 мая в 13:00" -> capitalized "Суббота, 25 мая в 13:00"
      expect(formatMoscowRelativeDateTime(testDate, baseDate)).toBe("Суббота, 25 мая в 13:00");
    });
  });

  describe("formatSport", () => {
    it("returns label for valid sport", () => {
      expect(formatSport("running")).toBe("Бег");
      expect(formatSport("skiing")).toBe("Лыжи");
    });

    it("returns dash for null", () => {
      expect(formatSport(null)).toBe("—");
    });
  });
});
