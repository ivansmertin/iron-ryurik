import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import {
  buildFreeSlotCandidates,
  reconcileFreeSlotsWithDb,
} from "@/features/gym-schedule/service";

const mondayNow = new Date("2026-04-13T05:00:00.000Z"); // Monday 08:00 Moscow

function workingHours(open = true) {
  return Array.from({ length: 7 }, (_, index) => ({
    weekday: index + 1,
    isOpen: open && index === 0,
    opensAtMinutes: 9 * 60,
    closesAtMinutes: 12 * 60,
  }));
}

describe("gym schedule free slots", () => {
  it("builds hourly free slots inside working hours without past slots", () => {
    const candidates = buildFreeSlotCandidates({
      freeSlotCapacity: 8,
      freeSlotDurationMinutes: 60,
      freeSlotDropInPrice: 0,
      workingHours: workingHours(),
      now: mondayNow,
    });

    expect(candidates.slice(0, 3).map((candidate) => candidate.autoSlotKey)).toEqual([
      "free:2026-04-13:0900",
      "free:2026-04-13:1000",
      "free:2026-04-13:1100",
    ]);
    expect(new Set(candidates.map((candidate) => candidate.autoSlotKey)).size).toBe(
      candidates.length,
    );
  });

  it("skips slots that overlap manual sessions", async () => {
    const db = {
      session: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "manual-1",
            origin: "manual",
            autoSlotKey: null,
            startsAt: new Date("2026-04-13T07:00:00.000Z"),
            durationMinutes: 60,
            status: "scheduled",
            bookings: [],
          },
        ]),
        deleteMany: vi.fn(),
        upsert: vi.fn(),
      },
    };

    await reconcileFreeSlotsWithDb(
      db as never,
      {
        freeSlotCapacity: 8,
        freeSlotDurationMinutes: 60,
        freeSlotDropInPrice: 0,
        workingHours: workingHours(),
      },
      mondayNow,
    );

    const upsertedKeys = db.session.upsert.mock.calls.map(
      ([input]) => input.where.autoSlotKey,
    );

    expect(upsertedKeys).toContain("free:2026-04-13:0900");
    expect(upsertedKeys).not.toContain("free:2026-04-13:1000");
    expect(upsertedKeys).toContain("free:2026-04-13:1100");
  });

  it("deletes stale free slots when working hours are shortened", async () => {
    const db = {
      session: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "stale-1",
            origin: "auto_free",
            autoSlotKey: "free:2026-04-13:1100", // This will be outside new hours
            startsAt: new Date("2026-04-13T08:00:00.000Z"),
            durationMinutes: 60,
            status: "scheduled",
            bookings: [],
          },
        ]),
        deleteMany: vi.fn(),
        upsert: vi.fn(),
      },
    };

    // New hours: only 09:00 - 11:00 (11:00 slot is excluded)
    const shortenedHours = workingHours();
    shortenedHours[0].closesAtMinutes = 11 * 60;

    await reconcileFreeSlotsWithDb(
      db as never,
      {
        freeSlotCapacity: 8,
        freeSlotDurationMinutes: 60,
        freeSlotDropInPrice: 0,
        workingHours: shortenedHours,
      },
      mondayNow,
    );

    expect(db.session.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["stale-1"] } },
    });
  });

  it("throws error if stale slots have active bookings", async () => {
    const db = {
      session: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "stale-with-booking",
            origin: "auto_free",
            autoSlotKey: "free:2026-04-13:1100",
            startsAt: new Date("2026-04-13T08:00:00.000Z"),
            durationMinutes: 60,
            status: "scheduled",
            bookings: [{ id: "booking-1" }],
          },
        ]),
      },
    };

    const shortenedHours = workingHours();
    shortenedHours[0].closesAtMinutes = 11 * 60;

    await expect(
      reconcileFreeSlotsWithDb(
        db as never,
        {
          freeSlotCapacity: 8,
          freeSlotDurationMinutes: 60,
          freeSlotDropInPrice: 0,
          workingHours: shortenedHours,
        },
        mondayNow,
      )
    ).rejects.toThrow("Нельзя сузить рабочее время");
  });

  it("does not upsert if slot already matches desired state (optimization)", async () => {
    const db = {
      session: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "existing-1",
            origin: "auto_free",
            autoSlotKey: "free:2026-04-13:0900",
            startsAt: new Date("2026-04-13T06:00:00.000Z"),
            durationMinutes: 60,
            status: "scheduled",
            title: "Свободная тренировка",
            capacity: 8,
            description: null,
            trainerId: null,
            cancellationDeadlineHours: 2,
            dropInEnabled: true,
            dropInPrice: null,
            bookings: [],
          },
        ]),
        upsert: vi.fn(),
        deleteMany: vi.fn(),
      },
    };

    await reconcileFreeSlotsWithDb(
      db as never,
      {
        freeSlotCapacity: 8,
        freeSlotDurationMinutes: 60,
        freeSlotDropInPrice: 0,
        workingHours: workingHours(),
      },
      mondayNow,
    );

    // The 09:00 slot matches perfectly, so it should NOT be in the upsert list
    const upsertedKeys = db.session.upsert.mock.calls.map(
      ([input]) => input.where.autoSlotKey,
    );
    expect(upsertedKeys).not.toContain("free:2026-04-13:0900");
    // But other slots (10:00, 11:00) should be upserted as they are new
    expect(upsertedKeys).toContain("free:2026-04-13:1000");
  });

  // Регрессия: свободные тренировки должны быть доступны клиенту для разовой
  // записи, иначе клиент без абонемента не может записаться — см. баг
  // "у клиента в расписании видны только групповые слоты".
  it("creates auto_free slots with drop-in enabled and synced price", async () => {
    const db = {
      session: {
        findMany: vi.fn().mockResolvedValue([]),
        deleteMany: vi.fn(),
        upsert: vi.fn(),
      },
    };

    await reconcileFreeSlotsWithDb(
      db as never,
      {
        freeSlotCapacity: 8,
        freeSlotDurationMinutes: 60,
        freeSlotDropInPrice: 750,
        workingHours: workingHours(),
      },
      mondayNow,
    );

    expect(db.session.upsert).toHaveBeenCalled();
    for (const [input] of db.session.upsert.mock.calls) {
      expect(input.create.dropInEnabled).toBe(true);
      expect(input.create.dropInPrice).toBeInstanceOf(Prisma.Decimal);
      expect(input.create.dropInPrice.equals(new Prisma.Decimal(750))).toBe(true);
      expect(input.update.dropInEnabled).toBe(true);
      expect(input.update.dropInPrice.equals(new Prisma.Decimal(750))).toBe(true);
    }
  });

  it("re-syncs existing auto_free slot when drop-in fields are stale", async () => {
    const db = {
      session: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "existing-1",
            origin: "auto_free",
            autoSlotKey: "free:2026-04-13:0900",
            startsAt: new Date("2026-04-13T06:00:00.000Z"),
            durationMinutes: 60,
            status: "scheduled",
            title: "Свободная тренировка",
            capacity: 8,
            description: null,
            trainerId: null,
            cancellationDeadlineHours: 2,
            // Устаревшее состояние — слот был создан до фикса
            dropInEnabled: false,
            dropInPrice: null,
            bookings: [],
          },
        ]),
        deleteMany: vi.fn(),
        upsert: vi.fn(),
      },
    };

    await reconcileFreeSlotsWithDb(
      db as never,
      {
        freeSlotCapacity: 8,
        freeSlotDurationMinutes: 60,
        freeSlotDropInPrice: 500,
        workingHours: workingHours(),
      },
      mondayNow,
    );

    const upsertCall = db.session.upsert.mock.calls.find(
      ([input]) => input.where.autoSlotKey === "free:2026-04-13:0900",
    );
    expect(upsertCall).toBeDefined();
    expect(upsertCall![0].update.dropInEnabled).toBe(true);
    expect(upsertCall![0].update.dropInPrice.equals(new Prisma.Decimal(500))).toBe(
      true,
    );
  });

  it("keeps drop-in enabled but clears price when freeSlotDropInPrice is 0", async () => {
    const db = {
      session: {
        findMany: vi.fn().mockResolvedValue([]),
        deleteMany: vi.fn(),
        upsert: vi.fn(),
      },
    };

    await reconcileFreeSlotsWithDb(
      db as never,
      {
        freeSlotCapacity: 8,
        freeSlotDurationMinutes: 60,
        freeSlotDropInPrice: 0,
        workingHours: workingHours(),
      },
      mondayNow,
    );

    expect(db.session.upsert).toHaveBeenCalled();
    for (const [input] of db.session.upsert.mock.calls) {
      expect(input.create.dropInEnabled).toBe(true);
      expect(input.create.dropInPrice).toBeNull();
      expect(input.update.dropInEnabled).toBe(true);
      expect(input.update.dropInPrice).toBeNull();
    }
  });

  it("handles long manual sessions blocking multiple slots", async () => {
    const db = {
      session: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "long-session",
            origin: "manual",
            autoSlotKey: null,
            startsAt: new Date("2026-04-13T06:30:00.000Z"), // 09:30 Moscow
            durationMinutes: 120, // 2 hours, until 11:30
            status: "scheduled",
            bookings: [],
          },
        ]),
        deleteMany: vi.fn(),
        upsert: vi.fn(),
      },
    };

    await reconcileFreeSlotsWithDb(
      db as never,
      {
        freeSlotCapacity: 8,
        freeSlotDurationMinutes: 60,
        freeSlotDropInPrice: 0,
        workingHours: workingHours(),
      },
      mondayNow,
    );

    const upsertedKeys = db.session.upsert.mock.calls.map(
      ([input]) => input.where.autoSlotKey,
    );

    // 09:00 slot overlaps (ends at 10:00, session starts at 09:30)
    expect(upsertedKeys).not.toContain("free:2026-04-13:0900");
    // 10:00 slot overlaps
    expect(upsertedKeys).not.toContain("free:2026-04-13:1000");
    // 11:00 slot overlaps (starts at 11:00, session ends at 11:30)
    expect(upsertedKeys).not.toContain("free:2026-04-13:1100");
  });
});
