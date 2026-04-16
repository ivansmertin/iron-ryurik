import { Prisma } from "@prisma/client";
import { CANCELLATION_DEADLINE_HOURS } from "./constants";

export type BookingErrorCode =
  | "NO_ACTIVE_MEMBERSHIP"
  | "SESSION_FULL"
  | "SESSION_NOT_AVAILABLE"
  | "ALREADY_BOOKED"
  | "SESSION_IN_PAST"
  | "BOOKING_NOT_FOUND"
  | "BOOKING_NOT_AVAILABLE"
  | "FORBIDDEN"
  | "CANCELLATION_TOO_LATE"
  | "INTERNAL_ERROR";

export const bookingErrorMessages: Record<BookingErrorCode, string> = {
  NO_ACTIVE_MEMBERSHIP: "Нет активного абонемента с оставшимися занятиями",
  SESSION_FULL: "Мест нет",
  SESSION_NOT_AVAILABLE: "Сессия отменена или завершена",
  ALREADY_BOOKED: "Вы уже записаны",
  SESSION_IN_PAST: "Нельзя записаться на прошедшую сессию",
  BOOKING_NOT_FOUND: "Запись не найдена",
  BOOKING_NOT_AVAILABLE: "Запись уже отменена или завершена",
  FORBIDDEN: "Нельзя отменить чужую запись",
  CANCELLATION_TOO_LATE: `Отмена невозможна менее чем за ${CANCELLATION_DEADLINE_HOURS} часов до начала`,
  INTERNAL_ERROR: "Не удалось выполнить операцию",
};

export class BookingServiceError extends Error {
  code: BookingErrorCode;

  constructor(code: BookingErrorCode, message = bookingErrorMessages[code]) {
    super(message);
    this.name = "BookingServiceError";
    this.code = code;
  }
}

export type BookingMutationClient = Pick<
  Prisma.TransactionClient,
  "session" | "booking" | "membership" | "$queryRaw"
>;

type LockedSessionRow = {
  id: string;
  title: string | null;
  startsAt: Date;
  durationMinutes: number;
  capacity: number;
  status: string;
  type: string;
};

type LockedMembershipRow = {
  id: string;
  status: string;
  visitsRemaining: number;
};

type LockedBookingRow = {
  id: string;
  userId: string;
  sessionId: string;
  membershipId: string | null;
  status: string;
};

export type BookSessionResult = {
  bookingId: string;
  sessionId: string;
  sessionTitle: string | null;
  startsAt: Date;
  durationMinutes: number;
};

export type CancelBookingResult = {
  bookingId: string;
  sessionId: string;
  sessionTitle: string | null;
  startsAt: Date;
  durationMinutes: number;
  membershipRestored: boolean;
};

function raise(code: BookingErrorCode): never {
  throw new BookingServiceError(code);
}

async function lockSession(
  db: BookingMutationClient,
  sessionId: string,
): Promise<LockedSessionRow> {
  const rows = await db.$queryRaw<LockedSessionRow[]>(Prisma.sql`
    SELECT
      id,
      title,
      "startsAt",
      "durationMinutes",
      capacity,
      status,
      type
    FROM "Session"
    WHERE id = ${sessionId}
    FOR UPDATE
  `);

  const session = rows[0];

  if (!session || session.type !== "group" || session.status !== "scheduled") {
    raise("SESSION_NOT_AVAILABLE");
  }

  return session;
}

async function lockSessionForCancellation(
  db: BookingMutationClient,
  sessionId: string,
): Promise<Pick<LockedSessionRow, "id" | "title" | "startsAt" | "durationMinutes">> {
  const rows = await db.$queryRaw<
    Pick<LockedSessionRow, "id" | "title" | "startsAt" | "durationMinutes">[]
  >(
    Prisma.sql`
      SELECT id, title, "startsAt", "durationMinutes"
      FROM "Session"
      WHERE id = ${sessionId}
      FOR UPDATE
    `,
  );

  const session = rows[0];

  if (!session) {
    raise("SESSION_NOT_AVAILABLE");
  }

  return session;
}

async function lockMembershipForBooking(
  db: BookingMutationClient,
  userId: string,
): Promise<LockedMembershipRow> {
  const rows = await db.$queryRaw<LockedMembershipRow[]>(Prisma.sql`
    SELECT id, status, "visitsRemaining"
    FROM "Membership"
    WHERE "userId" = ${userId}
      AND status = 'active'
      AND "endsAt" >= NOW()
      AND "visitsRemaining" > 0
    ORDER BY "endsAt" ASC
    LIMIT 1
    FOR UPDATE
  `);

  const membership = rows[0];

  if (!membership) {
    raise("NO_ACTIVE_MEMBERSHIP");
  }

  return membership;
}

async function lockMembershipForRefund(
  db: BookingMutationClient,
  membershipId: string,
): Promise<LockedMembershipRow | null> {
  const rows = await db.$queryRaw<LockedMembershipRow[]>(Prisma.sql`
    SELECT id, status, "visitsRemaining"
    FROM "Membership"
    WHERE id = ${membershipId}
    FOR UPDATE
  `);

  return rows[0] ?? null;
}

async function lockBooking(
  db: BookingMutationClient,
  bookingId: string,
): Promise<LockedBookingRow | null> {
  const rows = await db.$queryRaw<LockedBookingRow[]>(Prisma.sql`
    SELECT id, "userId", "sessionId", "membershipId", status
    FROM "Booking"
    WHERE id = ${bookingId}
    FOR UPDATE
  `);

  return rows[0] ?? null;
}

export async function bookSessionForUser(
  db: BookingMutationClient,
  userId: string,
  sessionId: string,
  now = new Date(),
): Promise<BookSessionResult> {
  const session = await lockSession(db, sessionId);

  if (session.startsAt.getTime() <= now.getTime()) {
    raise("SESSION_IN_PAST");
  }

  const currentBookings = await db.booking.count({
    where: {
      sessionId,
      status: "booked",
    },
  });

  if (currentBookings >= session.capacity) {
    raise("SESSION_FULL");
  }

  const existingBooking = await db.booking.findFirst({
    where: {
      userId,
      sessionId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (existingBooking?.status === "booked") {
    raise("ALREADY_BOOKED");
  }

  const membership = await lockMembershipForBooking(db, userId);
  const bookedAt = now;
  let bookingId: string;

  if (existingBooking?.status === "cancelled") {
    const booking = await db.booking.update({
      where: {
        id: existingBooking.id,
      },
      data: {
        status: "booked",
        bookedAt,
        cancelledAt: null,
        cancelReason: null,
        membershipId: membership.id,
      },
    });

    bookingId = booking.id;
  } else {
    const booking = await db.booking.create({
      data: {
        userId,
        sessionId,
        membershipId: membership.id,
        status: "booked",
        bookedAt,
      },
    });

    bookingId = booking.id;
  }

  await db.membership.update({
    where: {
      id: membership.id,
    },
    data: {
      visitsRemaining: {
        decrement: 1,
      },
    },
  });

  return {
    bookingId,
    sessionId: session.id,
    sessionTitle: session.title,
    startsAt: session.startsAt,
    durationMinutes: session.durationMinutes,
  };
}

export async function cancelBookingForUser(
  db: BookingMutationClient,
  userId: string,
  bookingId: string,
  now = new Date(),
): Promise<CancelBookingResult> {
  const booking = await lockBooking(db, bookingId);

  if (!booking) {
    raise("BOOKING_NOT_FOUND");
  }

  if (booking.userId !== userId) {
    raise("FORBIDDEN");
  }

  if (booking.status !== "booked") {
    raise("BOOKING_NOT_AVAILABLE");
  }

  const session = await lockSessionForCancellation(db, booking.sessionId);

  const hoursUntilStart =
    (session.startsAt.getTime() - now.getTime()) / (60 * 60 * 1000);

  if (hoursUntilStart < CANCELLATION_DEADLINE_HOURS) {
    raise("CANCELLATION_TOO_LATE");
  }

  const cancelledAt = now;

  await db.booking.update({
    where: {
      id: booking.id,
    },
    data: {
      status: "cancelled",
      cancelledAt,
      cancelReason: "client_cancelled",
    },
  });

  let membershipRestored = false;

  if (booking.membershipId) {
    const membership = await lockMembershipForRefund(db, booking.membershipId);

    if (membership?.status === "active") {
      await db.membership.update({
        where: {
          id: membership.id,
        },
        data: {
          visitsRemaining: {
            increment: 1,
          },
        },
      });

      membershipRestored = true;
    }
  }

  return {
    bookingId: booking.id,
    sessionId: session.id,
    sessionTitle: session.title,
    startsAt: session.startsAt,
    durationMinutes: session.durationMinutes,
    membershipRestored,
  };
}
