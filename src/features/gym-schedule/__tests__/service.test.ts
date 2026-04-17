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
      gymSettings: {},
      gymWorkingHour: {},
    };

    await reconcileFreeSlotsWithDb(
      db as never,
      {
        freeSlotCapacity: 8,
        freeSlotDurationMinutes: 60,
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
});
