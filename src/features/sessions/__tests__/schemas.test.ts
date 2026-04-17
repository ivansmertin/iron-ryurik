import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createSessionSchema, updateSessionSchema } from "../schemas";

describe("sessions schemas", () => {
  const validSessionData = {
    title: "Morning Run",
    description: "Group running session",
    trainerId: "00000000-0000-0000-0000-000000000000",
    date: "2024-06-01",
    startTime: "09:00",
    durationMinutes: 60,
    capacity: 10,
    cancellationDeadlineHours: 12,
  };

  beforeEach(() => {
    // Set system time to May 20, 2024
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-05-20T10:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("createSessionSchema", () => {
    it("validates correct session data", () => {
      expect(createSessionSchema.safeParse(validSessionData).success).toBe(true);
    });

    it("errors if title is empty", () => {
      const result = createSessionSchema.safeParse({ ...validSessionData, title: "" });
      expect(result.success).toBe(false);
    });

    it("errors if duration is not multiple of 5", () => {
      const result = createSessionSchema.safeParse({ ...validSessionData, durationMinutes: 63 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Длительность должна быть кратна 5 минутам");
      }
    });

    it("errors if date is in the past", () => {
      // System time is May 20, 2024. Let's try May 19.
      const result = createSessionSchema.safeParse({ ...validSessionData, date: "2024-05-19" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Дата и время должны быть в будущем");
      }
    });

    it("errors if capacity is less than 1", () => {
      const result = createSessionSchema.safeParse({ ...validSessionData, capacity: 0 });
      expect(result.success).toBe(false);
    });
  });

  describe("updateSessionSchema", () => {
    const defaultOptions = {
      hasActiveBookings: false,
      isPastSession: false,
      currentStartsAt: new Date("2024-06-01T06:00:00.000Z"), // 09:00 Moscow
      currentDurationMinutes: 60,
      currentCapacity: 10,
    };

    it("allows changes when no bookings and not past", () => {
      const schema = updateSessionSchema(defaultOptions);
      const data = { ...validSessionData, title: "Updated Title" };
      expect(schema.safeParse(data).success).toBe(true);
    });

    it("blocks date change if has active bookings", () => {
      const schema = updateSessionSchema({ ...defaultOptions, hasActiveBookings: true });
      const data = { ...validSessionData, startTime: "10:00" }; // Change time
      const result = schema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Нельзя изменить: уже есть записи");
      }
    });

    it("blocks capacity reduction if has active bookings", () => {
      const schema = updateSessionSchema({ ...defaultOptions, hasActiveBookings: true });
      const data = { ...validSessionData, capacity: 5 }; // Reduce from 10
      const result = schema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Нельзя уменьшить вместимость: уже есть записи");
      }
    });

    it("allows capacity increase even with active bookings", () => {
      const schema = updateSessionSchema({ ...defaultOptions, hasActiveBookings: true });
      const data = { ...validSessionData, capacity: 15 }; // Increase from 10
      expect(schema.safeParse(data).success).toBe(true);
    });

    it("blocks all critical changes for past sessions", () => {
      const schema = updateSessionSchema({ ...defaultOptions, isPastSession: true });
      
      // Change title is OK (base schema doesn't block it specifically)
      // Actually updateSessionSchema only blocks startsAt, duration, capacity for past sessions.
      
      const res1 = schema.safeParse({ ...validSessionData, startTime: "10:00" });
      expect(res1.success).toBe(false);
      
      const res2 = schema.safeParse({ ...validSessionData, durationMinutes: 90 });
      expect(res2.success).toBe(false);
      
      const res3 = schema.safeParse({ ...validSessionData, capacity: 20 });
      expect(res3.success).toBe(false);
    });
  });
});
