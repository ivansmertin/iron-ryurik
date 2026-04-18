import { Prisma } from "@prisma/client";
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
  origin: "manual",
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
  dropInEnabled = false,
  dropInPrice = null,
  origin = "manual",
  freeSlotDropInPrice = new Prisma.Decimal(0),
}: {
  existingBooking?: {
    id: string;
    status: string;
  } | null;
  currentBookings?: number;
  membership?: typeof membershipRow | null;
  dropInEnabled?: boolean;
  dropInPrice?: Prisma.Decimal | null;
  origin?: "manual" | "auto_free";
  freeSlotDropInPrice?: Prisma.Decimal;
} = {}) {
  const session = {
    ...sessionRow,
    origin,
    dropInEnabled,
    dropInPrice,
  };
  return {
    $queryRaw: vi
      .fn()
      .mockResolvedValueOnce([session])
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
    gymSettings: {
      findUnique: vi.fn().mockResolvedValue({
        freeSlotDropInPrice,
      }),
    },
    dropInPass: {
      create: vi.fn().mockResolvedValue({ id: "drop-in-new" }),
      update: vi.fn().mockResolvedValue({ id: "drop-in-1" }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
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
    dropInId: null,
    status,
    sessionTitle: "Intervals",
    startsAt: new Date("2026-04-14T15:00:00.000Z"),
    durationMinutes: 60,
    sessionStatus: "scheduled",
    clientFullName: "Client One",
    clientEmail: "client@example.com",
    visitsRemaining: 3,
    dropInStatus: null,
    dropInPrice: null,
    dropInEnabled: false,
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
    dropInPass: {
      create: vi.fn().mockResolvedValue({ id: "drop-in-new" }),
      update: vi.fn().mockResolvedValue({ id: "drop-in-1" }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
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
      dropInPassId: null,
    });
    expect(db.membership.update).not.toHaveBeenCalled();
    expect(db.booking.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        sessionId: "session-1",
        membershipId: "membership-1",
        dropInId: null,
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
        user: {
          is: {
            deletedAt: null,
          },
        },
      },
    });
  });

  it("rejects when the session is full", async () => {
    const db = createBookingDb({ currentBookings: 8 }); // capacity is 8

    await expect(
      bookSessionForUser(db as never, "user-1", "session-1", now),
    ).rejects.toMatchObject({ code: "SESSION_FULL" });
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

  it("falls back to drop-in booking if no membership and drop-in is enabled", async () => {
    const db = createBookingDb({
      membership: null,
      dropInEnabled: true,
      dropInPrice: new Prisma.Decimal(500),
    });

    const result = await bookSessionForUser(db as never, "user-1", "session-1", now);

    expect(result.dropInPassId).toBe("drop-in-new");
    expect(db.dropInPass.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        sessionId: "session-1",
        price: new Prisma.Decimal(500),
        status: "pending",
      },
    });
    expect(db.booking.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        sessionId: "session-1",
        membershipId: null,
        dropInId: "drop-in-new",
        status: "pending",
        bookedAt: now,
      },
    });
  });

  it("allows no-membership booking for legacy auto_free slots and uses gym price", async () => {
    const db = createBookingDb({
      membership: null,
      origin: "auto_free",
      dropInEnabled: false,
      dropInPrice: null,
      freeSlotDropInPrice: new Prisma.Decimal(750),
    });

    const result = await bookSessionForUser(db as never, "user-1", "session-1", now);

    expect(result.dropInPassId).toBe("drop-in-new");
    expect(db.gymSettings.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      select: { freeSlotDropInPrice: true },
    });
    expect(db.dropInPass.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        sessionId: "session-1",
        price: new Prisma.Decimal(750),
        status: "pending",
      },
    });
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
        dropInId: null,
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
            dropInId: null,
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
      dropInPass: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
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
            dropInId: null,
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
      dropInPass: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
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
      paymentSource: "membership",
      dropInPassId: null,
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
