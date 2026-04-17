import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import {
  bookSessionAsDropIn,
  markDropInPassPaid,
  cancelDropInPass,
  refundDropInPass,
  createWalkInDropIn,
  DropInServiceError,
} from "@/features/drop-ins/service";

const now = new Date("2026-04-14T12:00:00.000Z");
const futureStart = new Date("2026-04-14T15:00:00.000Z");

// ───────────────── Fixtures ─────────────────

const sessionRow = {
  id: "session-1",
  title: "ОФП для бегунов",
  startsAt: futureStart,
  durationMinutes: 60,
  capacity: 8,
  status: "scheduled",
  type: "group",
  origin: "manual",
  dropInPrice: new Prisma.Decimal("500.00"),
  dropInEnabled: true,
};

const autoFreeSessionRow = {
  ...sessionRow,
  id: "session-auto",
  origin: "auto_free",
  dropInPrice: null,
  dropInEnabled: false,
};

// ───────────────── bookSessionAsDropIn ─────────────────

describe("bookSessionAsDropIn", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function createDb({
    session = sessionRow as typeof sessionRow,
    currentBookings = 0,
    existingBooking = null as { id: string; status: string; dropInId: string | null } | null,
    gymSettings = { freeSlotDropInPrice: new Prisma.Decimal("300.00") },
  } = {}) {
    return {
      $queryRaw: vi.fn().mockResolvedValueOnce([session]),
      booking: {
        count: vi.fn().mockResolvedValue(currentBookings),
        findFirst: vi.fn().mockResolvedValue(existingBooking),
        create: vi.fn().mockResolvedValue({ id: "booking-new" }),
        update: vi.fn().mockResolvedValue({ id: existingBooking?.id ?? "booking-new" }),
      },
      dropInPass: {
        create: vi.fn().mockResolvedValue({
          id: "pass-new",
          price: session.dropInPrice ?? gymSettings.freeSlotDropInPrice,
        }),
      },
      gymSettings: {
        findUnique: vi.fn().mockResolvedValue(gymSettings),
      },
      session: {},
    };
  }

  it("creates a pending drop-in pass and booking for manual session", async () => {
    const db = createDb();

    const result = await bookSessionAsDropIn(db as never, "user-1", "session-1", now);

    expect(result).toMatchObject({
      bookingId: "booking-new",
      dropInPassId: "pass-new",
      sessionId: "session-1",
    });
    expect(db.dropInPass.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        sessionId: "session-1",
        price: new Prisma.Decimal("500.00"),
        status: "pending",
      },
    });
    expect(db.booking.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        sessionId: "session-1",
        membershipId: null,
        dropInId: "pass-new",
        status: "pending",
        bookedAt: now,
      },
    });
  });

  it("resolves price from GymSettings for auto_free sessions", async () => {
    const db = createDb({ session: autoFreeSessionRow as never });

    await bookSessionAsDropIn(db as never, "user-1", "session-auto", now);

    expect(db.gymSettings.findUnique).toHaveBeenCalled();
    expect(db.dropInPass.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          price: new Prisma.Decimal("300.00"),
        }),
      }),
    );
  });

  it("rejects when session is full", async () => {
    const db = createDb({ currentBookings: 8 });

    await expect(
      bookSessionAsDropIn(db as never, "user-1", "session-1", now),
    ).rejects.toMatchObject({ code: "SESSION_FULL" });
  });

  it("rejects when already booked", async () => {
    const db = createDb({
      existingBooking: { id: "booking-1", status: "pending", dropInId: null },
    });

    await expect(
      bookSessionAsDropIn(db as never, "user-1", "session-1", now),
    ).rejects.toMatchObject({ code: "ALREADY_BOOKED" });
  });

  it("rejects when session is in the past", async () => {
    const pastNow = new Date("2026-04-14T16:00:00.000Z");
    const db = createDb();

    await expect(
      bookSessionAsDropIn(db as never, "user-1", "session-1", pastNow),
    ).rejects.toMatchObject({ code: "SESSION_IN_PAST" });
  });

  it("rejects when drop-in is disabled for manual session", async () => {
    const db = createDb({
      session: { ...sessionRow, dropInEnabled: false },
    });

    await expect(
      bookSessionAsDropIn(db as never, "user-1", "session-1", now),
    ).rejects.toMatchObject({ code: "DROP_IN_NOT_AVAILABLE" });
  });

  it("rejects when drop-in price is not set for manual session", async () => {
    const db = createDb({
      session: { ...sessionRow, dropInPrice: null } as never,
    });

    await expect(
      bookSessionAsDropIn(db as never, "user-1", "session-1", now),
    ).rejects.toMatchObject({ code: "DROP_IN_PRICE_NOT_SET" });
  });

  it("rejects when free slot price is zero for auto_free session", async () => {
    const db = createDb({
      session: autoFreeSessionRow as never,
      gymSettings: { freeSlotDropInPrice: new Prisma.Decimal("0") },
    });

    await expect(
      bookSessionAsDropIn(db as never, "user-1", "session-auto", now),
    ).rejects.toMatchObject({ code: "FREE_SLOT_PRICE_NOT_SET" });
  });

  it("reuses a cancelled booking", async () => {
    const db = createDb({
      existingBooking: { id: "booking-old", status: "cancelled", dropInId: null },
    });

    const result = await bookSessionAsDropIn(db as never, "user-1", "session-1", now);

    expect(result.bookingId).toBe("booking-old");
    expect(db.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "booking-old" },
        data: expect.objectContaining({
          status: "pending",
          membershipId: null,
          dropInId: "pass-new",
        }),
      }),
    );
    expect(db.booking.create).not.toHaveBeenCalled();
  });
});

// ───────────────── markDropInPassPaid ─────────────────

describe("markDropInPassPaid", () => {
  function createPaidDb(passStatus = "pending") {
    return {
      $queryRaw: vi.fn().mockResolvedValueOnce([
        {
          id: "pass-1",
          userId: "user-1",
          sessionId: "session-1",
          status: passStatus,
          price: new Prisma.Decimal("500.00"),
          bookingId: "booking-1",
        },
      ]),
      dropInPass: {
        update: vi.fn().mockResolvedValue({ id: "pass-1" }),
      },
      booking: {},
      session: {},
      gymSettings: {},
    };
  }

  it("marks a pending pass as paid", async () => {
    const db = createPaidDb();

    const result = await markDropInPassPaid(db as never, "pass-1", "admin-1");

    expect(result).toMatchObject({
      dropInPassId: "pass-1",
      bookingId: "booking-1",
    });
    expect(db.dropInPass.update).toHaveBeenCalledWith({
      where: { id: "pass-1" },
      data: expect.objectContaining({
        status: "paid",
        paidById: "admin-1",
      }),
    });
  });

  it("allows custom paid amount", async () => {
    const db = createPaidDb();

    const result = await markDropInPassPaid(db as never, "pass-1", "admin-1", {
      paidAmount: "400.00",
    });

    expect(result.paidAmount.toString()).toBe("400");
  });

  it("rejects already paid pass", async () => {
    const db = createPaidDb("paid");

    await expect(
      markDropInPassPaid(db as never, "pass-1", "admin-1"),
    ).rejects.toMatchObject({ code: "DROP_IN_ALREADY_PAID" });
  });

  it("rejects cancelled pass", async () => {
    const db = createPaidDb("cancelled");

    await expect(
      markDropInPassPaid(db as never, "pass-1", "admin-1"),
    ).rejects.toMatchObject({ code: "DROP_IN_ALREADY_CANCELLED" });
  });

  it("rejects not found pass", async () => {
    const db = {
      $queryRaw: vi.fn().mockResolvedValueOnce([]),
      dropInPass: { update: vi.fn() },
      booking: {},
      session: {},
      gymSettings: {},
    };

    await expect(
      markDropInPassPaid(db as never, "nonexistent", "admin-1"),
    ).rejects.toMatchObject({ code: "DROP_IN_NOT_FOUND" });
  });
});

// ───────────────── cancelDropInPass ─────────────────

describe("cancelDropInPass", () => {
  function createCancelDb(passStatus = "pending", bookingId: string | null = "booking-1") {
    return {
      $queryRaw: vi.fn().mockResolvedValueOnce([
        {
          id: "pass-1",
          userId: "user-1",
          sessionId: "session-1",
          status: passStatus,
          price: new Prisma.Decimal("500.00"),
          bookingId,
        },
      ]),
      dropInPass: {
        update: vi.fn().mockResolvedValue({ id: "pass-1" }),
      },
      booking: {
        update: vi.fn().mockResolvedValue({ id: "booking-1" }),
      },
      session: {},
      gymSettings: {},
    };
  }

  it("cancels a pending pass and its booking", async () => {
    const db = createCancelDb();

    const result = await cancelDropInPass(db as never, "pass-1");

    expect(result).toMatchObject({
      dropInPassId: "pass-1",
      bookingId: "booking-1",
    });
    expect(db.dropInPass.update).toHaveBeenCalledWith({
      where: { id: "pass-1" },
      data: expect.objectContaining({ status: "cancelled" }),
    });
    expect(db.booking.update).toHaveBeenCalledWith({
      where: { id: "booking-1" },
      data: expect.objectContaining({
        status: "cancelled",
        cancelReason: "drop_in_cancelled",
      }),
    });
  });

  it("does not cancel booking if none linked", async () => {
    const db = createCancelDb("pending", null);

    await cancelDropInPass(db as never, "pass-1");

    expect(db.booking.update).not.toHaveBeenCalled();
  });

  it("rejects paid pass without allowPaid", async () => {
    const db = createCancelDb("paid");

    await expect(
      cancelDropInPass(db as never, "pass-1"),
    ).rejects.toMatchObject({ code: "DROP_IN_ALREADY_PAID" });
  });

  it("allows cancelling paid pass with allowPaid", async () => {
    const db = createCancelDb("paid");

    const result = await cancelDropInPass(db as never, "pass-1", {
      allowPaid: true,
    });

    expect(result.dropInPassId).toBe("pass-1");
  });

  it("rejects already cancelled pass", async () => {
    const db = createCancelDb("cancelled");

    await expect(
      cancelDropInPass(db as never, "pass-1"),
    ).rejects.toMatchObject({ code: "DROP_IN_ALREADY_CANCELLED" });
  });
});

// ───────────────── refundDropInPass ─────────────────

describe("refundDropInPass", () => {
  function createRefundDb(passStatus = "paid") {
    return {
      $queryRaw: vi.fn().mockResolvedValueOnce([
        {
          id: "pass-1",
          userId: "user-1",
          sessionId: "session-1",
          status: passStatus,
          price: new Prisma.Decimal("500.00"),
          bookingId: "booking-1",
        },
      ]),
      dropInPass: {
        update: vi.fn().mockResolvedValue({ id: "pass-1" }),
      },
      booking: {},
      session: {},
      gymSettings: {},
    };
  }

  it("refunds a paid pass", async () => {
    const db = createRefundDb();

    const result = await refundDropInPass(db as never, "pass-1", "admin-1");

    expect(result).toMatchObject({ dropInPassId: "pass-1" });
    expect(db.dropInPass.update).toHaveBeenCalledWith({
      where: { id: "pass-1" },
      data: expect.objectContaining({
        status: "refunded",
        refundedById: "admin-1",
      }),
    });
  });

  it("rejects non-paid pass", async () => {
    const db = createRefundDb("pending");

    await expect(
      refundDropInPass(db as never, "pass-1", "admin-1"),
    ).rejects.toMatchObject({ code: "DROP_IN_NOT_PAID" });
  });

  it("rejects already refunded pass", async () => {
    const db = createRefundDb("refunded");

    await expect(
      refundDropInPass(db as never, "pass-1", "admin-1"),
    ).rejects.toMatchObject({ code: "DROP_IN_ALREADY_REFUNDED" });
  });
});

// ───────────────── createWalkInDropIn ─────────────────

describe("createWalkInDropIn", () => {
  function createWalkInDb(gymPrice = new Prisma.Decimal("300.00")) {
    return {
      $queryRaw: vi.fn(),
      dropInPass: {
        create: vi.fn().mockResolvedValue({
          id: "pass-walkin",
          price: gymPrice,
        }),
      },
      booking: {},
      session: {},
      gymSettings: {
        findUnique: vi.fn().mockResolvedValue({
          freeSlotDropInPrice: gymPrice,
        }),
      },
    };
  }

  it("creates a paid walk-in pass using gym settings price", async () => {
    const db = createWalkInDb();

    const result = await createWalkInDropIn(db as never, {
      userId: "user-1",
      actorId: "trainer-1",
    });

    expect(result).toMatchObject({
      dropInPassId: "pass-walkin",
      userId: "user-1",
    });
    expect(db.dropInPass.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        status: "paid",
        paidById: "trainer-1",
        price: new Prisma.Decimal("300.00"),
      }),
    });
  });

  it("allows custom price override", async () => {
    const db = createWalkInDb();

    await createWalkInDropIn(db as never, {
      userId: "user-1",
      actorId: "trainer-1",
      price: "600.00",
    });

    expect(db.dropInPass.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        price: new Prisma.Decimal("600"),
      }),
    });
    expect(db.gymSettings.findUnique).not.toHaveBeenCalled();
  });

  it("rejects when free slot price is zero", async () => {
    const db = createWalkInDb(new Prisma.Decimal("0"));

    await expect(
      createWalkInDropIn(db as never, {
        userId: "user-1",
        actorId: "trainer-1",
      }),
    ).rejects.toMatchObject({ code: "FREE_SLOT_PRICE_NOT_SET" });
  });
});

// ───────────────── DropInServiceError ─────────────────

describe("DropInServiceError", () => {
  it("has correct name and code", () => {
    const err = new DropInServiceError("DROP_IN_NOT_FOUND");
    expect(err.name).toBe("DropInServiceError");
    expect(err.code).toBe("DROP_IN_NOT_FOUND");
    expect(err.message).toBe("Разовый визит не найден");
  });
});
