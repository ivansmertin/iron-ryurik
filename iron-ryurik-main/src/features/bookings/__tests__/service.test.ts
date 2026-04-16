import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  bookSessionForUser,
  cancelBookingForUser,
} from "@/features/bookings/service";

const now = new Date("2026-04-14T12:00:00.000Z");

function createBookingDb({
  sessionRow,
  membershipRow,
  existingBooking,
  currentBookings = 0,
}: {
  sessionRow: {
    id: string;
    title: string | null;
    startsAt: Date;
    durationMinutes: number;
    capacity: number;
    status: string;
    type: string;
  };
  membershipRow?: {
    id: string;
    status: string;
    visitsRemaining: number;
  };
  existingBooking?: {
    id: string;
    status: string;
  } | null;
  currentBookings?: number;
}) {
  const db = {
    $queryRaw: vi
      .fn()
      .mockResolvedValueOnce([sessionRow])
      .mockResolvedValueOnce(membershipRow ? [membershipRow] : []),
    booking: {
      count: vi.fn().mockResolvedValue(currentBookings),
      findFirst: vi.fn().mockResolvedValue(existingBooking ?? null),
      create: vi.fn().mockResolvedValue({ id: "booking-new" }),
      update: vi.fn().mockResolvedValue({ id: existingBooking?.id ?? "booking-new" }),
    },
    membership: {
      update: vi.fn().mockResolvedValue({ id: membershipRow?.id ?? "membership-1" }),
    },
    session: {
      update: vi.fn(),
    },
  };

  return db;
}

describe("bookSessionForUser", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("успешно бронирует занятие и списывает визит", async () => {
    const db = createBookingDb({
      sessionRow: {
        id: "session-1",
        title: "Интервалы",
        startsAt: new Date("2026-04-14T15:00:00.000Z"),
        durationMinutes: 60,
        capacity: 8,
        status: "scheduled",
        type: "group",
      },
      membershipRow: {
        id: "membership-1",
        status: "active",
        visitsRemaining: 3,
      },
    });

    const result = await bookSessionForUser(db as never, "user-1", "session-1", now);

    expect(result).toEqual({
      bookingId: "booking-new",
      sessionId: "session-1",
      sessionTitle: "Интервалы",
      startsAt: new Date("2026-04-14T15:00:00.000Z"),
      durationMinutes: 60,
    });
    expect(db.membership.update).toHaveBeenCalledWith({
      where: { id: "membership-1" },
      data: {
        visitsRemaining: {
          decrement: 1,
        },
      },
    });
    expect(db.booking.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        sessionId: "session-1",
        membershipId: "membership-1",
        status: "booked",
        bookedAt: now,
      },
    });
  });

  it("возвращает SESSION_FULL, если мест больше нет", async () => {
    const db = createBookingDb({
      sessionRow: {
        id: "session-1",
        title: "Интервалы",
        startsAt: new Date("2026-04-14T15:00:00.000Z"),
        durationMinutes: 60,
        capacity: 1,
        status: "scheduled",
        type: "group",
      },
      currentBookings: 1,
    });

    await expect(
      bookSessionForUser(db as never, "user-1", "session-1", now),
    ).rejects.toMatchObject({ code: "SESSION_FULL" });
    expect(db.booking.findFirst).not.toHaveBeenCalled();
  });

  it("возвращает NO_ACTIVE_MEMBERSHIP, если активного абонемента нет", async () => {
    const db = createBookingDb({
      sessionRow: {
        id: "session-1",
        title: "Интервалы",
        startsAt: new Date("2026-04-14T15:00:00.000Z"),
        durationMinutes: 60,
        capacity: 8,
        status: "scheduled",
        type: "group",
      },
      membershipRow: undefined,
    });

    await expect(
      bookSessionForUser(db as never, "user-1", "session-1", now),
    ).rejects.toMatchObject({ code: "NO_ACTIVE_MEMBERSHIP" });
  });

  it("возвращает ALREADY_BOOKED, если запись уже активна", async () => {
    const db = createBookingDb({
      sessionRow: {
        id: "session-1",
        title: "Интервалы",
        startsAt: new Date("2026-04-14T15:00:00.000Z"),
        durationMinutes: 60,
        capacity: 8,
        status: "scheduled",
        type: "group",
      },
      membershipRow: {
        id: "membership-1",
        status: "active",
        visitsRemaining: 3,
      },
      existingBooking: {
        id: "booking-1",
        status: "booked",
      },
    });

    await expect(
      bookSessionForUser(db as never, "user-1", "session-1", now),
    ).rejects.toMatchObject({ code: "ALREADY_BOOKED" });
    expect(db.membership.update).not.toHaveBeenCalled();
  });

  it("переиспользует отменённую запись", async () => {
    const db = createBookingDb({
      sessionRow: {
        id: "session-1",
        title: "Интервалы",
        startsAt: new Date("2026-04-14T15:00:00.000Z"),
        durationMinutes: 60,
        capacity: 8,
        status: "scheduled",
        type: "group",
      },
      membershipRow: {
        id: "membership-1",
        status: "active",
        visitsRemaining: 3,
      },
      existingBooking: {
        id: "booking-1",
        status: "cancelled",
      },
    });

    const result = await bookSessionForUser(db as never, "user-1", "session-1", now);

    expect(result.bookingId).toBe("booking-1");
    expect(db.booking.update).toHaveBeenCalledWith({
      where: { id: "booking-1" },
      data: {
        status: "booked",
        bookedAt: now,
        cancelledAt: null,
        cancelReason: null,
        membershipId: "membership-1",
      },
    });
    expect(db.booking.create).not.toHaveBeenCalled();
  });

  it.skip("@pending: needs test database for real race coverage", async () => {
    const sessionRow = {
      id: "session-1",
      title: "Intervals",
      startsAt: new Date("2026-04-14T15:00:00.000Z"),
      durationMinutes: 60,
      capacity: 1,
      status: "scheduled",
      type: "group",
    };

    const membershipRow = {
      id: "membership-1",
      status: "active",
      visitsRemaining: 2,
    };

    let bookings = 0;
    let rawCallCount = 0;
    let countCallCount = 0;
    let releaseSecondLock: (() => void) | null = null;

    const secondLockReleased = new Promise<void>((resolve) => {
      releaseSecondLock = resolve;
    });

    const db = {
      $queryRaw: vi.fn(async () => {
        rawCallCount += 1;

        if (rawCallCount === 1) {
          return [sessionRow];
        }

        if (rawCallCount === 2) {
          return [membershipRow];
        }

        if (rawCallCount === 3) {
          await secondLockReleased;
          return [sessionRow];
        }

        throw new Error("Unexpected raw query call");
      }),
      booking: {
        count: vi.fn(async () => {
          countCallCount += 1;

          if (countCallCount === 1) {
            await Promise.resolve();
          }

          return bookings;
        }),
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn(async () => {
          bookings += 1;
          releaseSecondLock?.();
          return { id: "booking-1" };
        }),
        update: vi.fn(),
      },
      membership: {
        update: vi.fn().mockResolvedValue({ id: "membership-1" }),
      },
      session: {
        update: vi.fn(),
      },
    };

    const results = await Promise.allSettled([
      bookSessionForUser(db as never, "user-1", "session-1", now),
      bookSessionForUser(db as never, "user-2", "session-1", now),
    ]);

    expect(results[0]?.status).toBe("fulfilled");
    expect(results[1]?.status).toBe("rejected");

    if (results[1]?.status === "rejected") {
      expect(results[1].reason).toMatchObject({ code: "SESSION_FULL" });
    }

    expect(db.booking.create).toHaveBeenCalledTimes(1);
    expect(db.membership.update).toHaveBeenCalledTimes(1);
  });
});

describe("cancelBookingForUser", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("отменяет запись и возвращает визит, если до старта больше 12 часов", async () => {
    const db = {
      $queryRaw: vi
        .fn()
        .mockResolvedValueOnce([
          {
            id: "booking-1",
            userId: "user-1",
            sessionId: "session-1",
            membershipId: "membership-1",
            status: "booked",
          },
        ])
        .mockResolvedValueOnce([
          {
            id: "session-1",
            title: "Интервалы",
            startsAt: new Date("2026-04-15T15:30:00.000Z"),
            durationMinutes: 60,
          },
        ])
        .mockResolvedValueOnce([
          {
            id: "membership-1",
            status: "active",
            visitsRemaining: 2,
          },
        ]),
      booking: {
        update: vi.fn().mockResolvedValue({ id: "booking-1" }),
      },
      membership: {
        update: vi.fn().mockResolvedValue({ id: "membership-1" }),
      },
      session: {
        update: vi.fn(),
      },
    };

    const result = await cancelBookingForUser(
      db as never,
      "user-1",
      "booking-1",
      now,
    );

    expect(result).toEqual({
      bookingId: "booking-1",
      sessionId: "session-1",
      sessionTitle: "Интервалы",
      startsAt: new Date("2026-04-15T15:30:00.000Z"),
      durationMinutes: 60,
      membershipRestored: true,
    });
    expect(db.booking.update).toHaveBeenCalledWith({
      where: { id: "booking-1" },
      data: {
        status: "cancelled",
        cancelledAt: now,
        cancelReason: "client_cancelled",
      },
    });
    expect(db.membership.update).toHaveBeenCalledWith({
      where: { id: "membership-1" },
      data: {
        visitsRemaining: {
          increment: 1,
        },
      },
    });
  });

  it("отказывает, если до начала меньше 12 часов", async () => {
    const db = {
      $queryRaw: vi
        .fn()
        .mockResolvedValueOnce([
          {
            id: "booking-1",
            userId: "user-1",
            sessionId: "session-1",
            membershipId: "membership-1",
            status: "booked",
          },
        ])
        .mockResolvedValueOnce([
          {
            id: "session-1",
            title: "Интервалы",
            startsAt: new Date("2026-04-14T20:00:00.000Z"),
            durationMinutes: 60,
          },
        ]),
      booking: {
        update: vi.fn(),
      },
      membership: {
        update: vi.fn(),
      },
      session: {
        update: vi.fn(),
      },
    };

    await expect(
      cancelBookingForUser(db as never, "user-1", "booking-1", now),
    ).rejects.toMatchObject({ code: "CANCELLATION_TOO_LATE" });
    expect(db.booking.update).not.toHaveBeenCalled();
  });

  it("отказывает, если отменяют чужую запись", async () => {
    const db = {
      $queryRaw: vi.fn().mockResolvedValueOnce([
        {
          id: "booking-1",
          userId: "other-user",
          sessionId: "session-1",
          membershipId: "membership-1",
          status: "booked",
        },
      ]),
      booking: {
        update: vi.fn(),
      },
      membership: {
        update: vi.fn(),
      },
      session: {
        update: vi.fn(),
      },
    };

    await expect(
      cancelBookingForUser(db as never, "user-1", "booking-1", now),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("не возвращает визит, если абонемента нет", async () => {
    const db = {
      $queryRaw: vi
        .fn()
        .mockResolvedValueOnce([
          {
            id: "booking-1",
            userId: "user-1",
            sessionId: "session-1",
            membershipId: null,
            status: "booked",
          },
        ])
        .mockResolvedValueOnce([
          {
            id: "session-1",
            title: "Интервалы",
            startsAt: new Date("2026-04-15T15:30:00.000Z"),
            durationMinutes: 60,
          },
        ]),
      booking: {
        update: vi.fn().mockResolvedValue({ id: "booking-1" }),
      },
      membership: {
        update: vi.fn(),
      },
      session: {
        update: vi.fn(),
      },
    };

    const result = await cancelBookingForUser(
      db as never,
      "user-1",
      "booking-1",
      now,
    );

    expect(result.membershipRestored).toBe(false);
    expect(db.membership.update).not.toHaveBeenCalled();
  });
});
