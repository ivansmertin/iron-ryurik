import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  bookSessionForUser,
  cancelBookingForUser,
  confirmAttendanceForBooking,
  markNoShowForBooking,
} from "@/features/bookings/service";

const now = new Date("2026-04-14T12:00:00.000Z");

const sessionRow = {
  id: "session-1",
  title: "Intervals",
  startsAt: new Date("2026-04-14T15:00:00.000Z"),
  durationMinutes: 60,
  capacity: 8,
  status: "scheduled",
  type: "group",
};

const membershipRow = {
  id: "membership-1",
  status: "active",
  visitsRemaining: 3,
  reservedSessions: 0,
};

function createBookingDb({
  existingBooking,
  currentBookings = 0,
  membership = membershipRow,
}: {
  existingBooking?: {
    id: string;
    status: string;
  } | null;
  currentBookings?: number;
  membership?: typeof membershipRow | null;
} = {}) {
  return {
    $queryRaw: vi
      .fn()
      .mockResolvedValueOnce([sessionRow])
      .mockResolvedValueOnce(membership ? [membership] : []),
    booking: {
      count: vi.fn().mockResolvedValue(currentBookings),
      findFirst: vi.fn().mockResolvedValue(existingBooking ?? null),
      create: vi.fn().mockResolvedValue({ id: "booking-new" }),
      update: vi.fn().mockResolvedValue({ id: existingBooking?.id ?? "booking-new" }),
    },
    membership: {
      update: vi.fn().mockResolvedValue({ id: membership?.id ?? "membership-1" }),
    },
    session: {
      update: vi.fn(),
    },
  };
}

function createAttendanceRow(status = "pending") {
  return {
    id: "booking-1",
    userId: "user-1",
    sessionId: "session-1",
    membershipId: "membership-1",
    status,
    sessionTitle: "Intervals",
    startsAt: new Date("2026-04-14T15:00:00.000Z"),
    durationMinutes: 60,
    sessionStatus: "scheduled",
    clientFullName: "Client One",
    clientEmail: "client@example.com",
    visitsRemaining: 3,
  };
}

function createAttendanceDb(status = "pending") {
  return {
    $queryRaw: vi
      .fn()
      .mockResolvedValueOnce([createAttendanceRow(status)])
      .mockResolvedValueOnce([membershipRow]),
    booking: {
      update: vi.fn().mockResolvedValue({ id: "booking-1" }),
    },
    membership: {
      update: vi.fn().mockResolvedValue({ id: "membership-1" }),
    },
    workoutLog: {
      upsert: vi.fn().mockResolvedValue({ id: "workout-log-1" }),
    },
    session: {
      update: vi.fn(),
    },
  };
}

function getRawSqlText(query: unknown) {
  if (
    query &&
    typeof query === "object" &&
    "strings" in query &&
    Array.isArray((query as { strings: unknown }).strings)
  ) {
    return (query as { strings: string[] }).strings.join("");
  }

  if (
    query &&
    typeof query === "object" &&
    "sql" in query &&
    typeof (query as { sql: unknown }).sql === "string"
  ) {
    return (query as { sql: string }).sql;
  }

  return String(query);
}

describe("bookSessionForUser", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates a pending booking without debiting the membership", async () => {
    const db = createBookingDb();

    const result = await bookSessionForUser(db as never, "user-1", "session-1", now);

    expect(result).toEqual({
      bookingId: "booking-new",
      sessionId: "session-1",
      sessionTitle: "Intervals",
      startsAt: new Date("2026-04-14T15:00:00.000Z"),
      durationMinutes: 60,
    });
    expect(db.membership.update).not.toHaveBeenCalled();
    expect(db.booking.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        sessionId: "session-1",
        membershipId: "membership-1",
        status: "pending",
        bookedAt: now,
      },
    });
  });

  it("counts active attendance states against session capacity", async () => {
    const db = createBookingDb({ currentBookings: 1 });

    await expect(
      bookSessionForUser(db as never, "user-1", "session-1", now),
    ).resolves.toBeDefined();

    expect(db.booking.count).toHaveBeenCalledWith({
      where: {
        sessionId: "session-1",
        status: {
          in: ["pending", "completed", "no_show"],
        },
      },
    });
  });

  it("requires available sessions after pending reservations are counted", async () => {
    const db = createBookingDb({ membership: null });

    await expect(
      bookSessionForUser(db as never, "user-1", "session-1", now),
    ).rejects.toMatchObject({ code: "NO_ACTIVE_MEMBERSHIP" });

    const membershipQuery = db.$queryRaw.mock.calls[1]?.[0];
    expect(getRawSqlText(membershipQuery)).toContain("b.status = 'pending'");
    expect(getRawSqlText(membershipQuery)).toContain('m."visitsRemaining" >');
  });

  it("rejects when the user already has a pending booking", async () => {
    const db = createBookingDb({
      existingBooking: {
        id: "booking-1",
        status: "pending",
      },
    });

    await expect(
      bookSessionForUser(db as never, "user-1", "session-1", now),
    ).rejects.toMatchObject({ code: "ALREADY_BOOKED" });
    expect(db.membership.update).not.toHaveBeenCalled();
  });

  it("reuses a cancelled booking as pending", async () => {
    const db = createBookingDb({
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
        status: "pending",
        bookedAt: now,
        cancelledAt: null,
        cancelReason: null,
        confirmedAt: null,
        confirmedById: null,
        confirmationMethod: null,
        membershipId: "membership-1",
      },
    });
    expect(db.booking.create).not.toHaveBeenCalled();
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

  it("cancels a pending booking without refunding visits", async () => {
    const db = {
      $queryRaw: vi
        .fn()
        .mockResolvedValueOnce([
          {
            id: "booking-1",
            userId: "user-1",
            sessionId: "session-1",
            membershipId: "membership-1",
            status: "pending",
          },
        ])
        .mockResolvedValueOnce([
          {
            id: "session-1",
            title: "Intervals",
            startsAt: new Date("2026-04-15T15:30:00.000Z"),
            durationMinutes: 60,
            cancellationDeadlineHours: 12,
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
    expect(db.booking.update).toHaveBeenCalledWith({
      where: { id: "booking-1" },
      data: {
        status: "cancelled",
        cancelledAt: now,
        cancelReason: "client_cancelled",
      },
    });
  });

  it("rejects late cancellation", async () => {
    const db = {
      $queryRaw: vi
        .fn()
        .mockResolvedValueOnce([
          {
            id: "booking-1",
            userId: "user-1",
            sessionId: "session-1",
            membershipId: "membership-1",
            status: "pending",
          },
        ])
        .mockResolvedValueOnce([
          {
            id: "session-1",
            title: "Intervals",
            startsAt: new Date("2026-04-14T20:00:00.000Z"),
            durationMinutes: 60,
            cancellationDeadlineHours: 12,
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
});

describe("attendance confirmation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("marks pending booking completed and debits one visit", async () => {
    const db = createAttendanceDb();

    const result = await confirmAttendanceForBooking(
      db as never,
      "booking-1",
      "admin-1",
      { method: "qr", now, requireQrWindow: true },
    );

    expect(result).toMatchObject({
      bookingId: "booking-1",
      status: "completed",
      alreadyProcessed: false,
      visitsRemaining: 2,
    });
    expect(db.membership.update).toHaveBeenCalledWith({
      where: { id: "membership-1" },
      data: {
        visitsRemaining: {
          decrement: 1,
        },
      },
    });
    expect(db.booking.update).toHaveBeenCalledWith({
      where: { id: "booking-1" },
      data: {
        status: "completed",
        confirmedAt: now,
        confirmedById: "admin-1",
        confirmationMethod: "qr",
      },
    });
    expect(db.workoutLog.upsert).toHaveBeenCalledWith({
      where: {
        userId_sessionId: {
          userId: "user-1",
          sessionId: "session-1",
        },
      },
      update: {},
      create: {
        userId: "user-1",
        sessionId: "session-1",
        performedAt: new Date("2026-04-14T15:00:00.000Z"),
        durationMin: 60,
      },
    });
  });

  it("does not debit again when booking is already completed", async () => {
    const db = createAttendanceDb("completed");

    const result = await confirmAttendanceForBooking(
      db as never,
      "booking-1",
      "admin-1",
      { method: "qr", now, requireQrWindow: true },
    );

    expect(result.alreadyProcessed).toBe(true);
    expect(db.membership.update).not.toHaveBeenCalled();
    expect(db.booking.update).not.toHaveBeenCalled();
    expect(db.workoutLog.upsert).toHaveBeenCalledTimes(1);
  });

  it("marks no-show and debits one visit after session start", async () => {
    const db = createAttendanceDb();
    const afterStart = new Date("2026-04-14T15:10:00.000Z");

    const result = await markNoShowForBooking(
      db as never,
      "booking-1",
      "trainer-1",
      afterStart,
    );

    expect(result).toMatchObject({
      status: "no_show",
      visitsRemaining: 2,
    });
    expect(db.booking.update).toHaveBeenCalledWith({
      where: { id: "booking-1" },
      data: {
        status: "no_show",
        confirmedAt: afterStart,
        confirmedById: "trainer-1",
        confirmationMethod: "no_show",
      },
    });
  });

  it("rejects no-show before the session starts", async () => {
    const db = createAttendanceDb();

    await expect(
      markNoShowForBooking(db as never, "booking-1", "trainer-1", now),
    ).rejects.toMatchObject({ code: "NO_SHOW_TOO_EARLY" });
    expect(db.membership.update).not.toHaveBeenCalled();
  });
});
