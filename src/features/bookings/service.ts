import { Prisma, type BookingConfirmationMethod } from "@prisma/client";
export const activeBookingStatuses = ["pending", "completed", "no_show"] as const;

const QR_CONFIRMATION_BEFORE_START_HOURS = 3;
const QR_CONFIRMATION_AFTER_END_HOURS = 2;

export type BookingErrorCode =
  | "NO_ACTIVE_MEMBERSHIP"
  | "NO_VISITS_REMAINING"
  | "SESSION_FULL"
  | "SESSION_NOT_AVAILABLE"
  | "ALREADY_BOOKED"
  | "SESSION_IN_PAST"
  | "BOOKING_NOT_FOUND"
  | "BOOKING_NOT_AVAILABLE"
  | "BOOKING_ALREADY_CONFIRMED"
  | "BOOKING_CANCELLED"
  | "FORBIDDEN"
  | "CANCELLATION_TOO_LATE"
  | "CONFIRMATION_WINDOW_CLOSED"
  | "NO_SHOW_TOO_EARLY"
  | "INVALID_QR_TOKEN"
  | "QR_TOKEN_EXPIRED"
  | "DROP_IN_PAYMENT_REQUIRED"
  | "DROP_IN_INCONSISTENT_STATE"
  | "INTERNAL_ERROR";

export const bookingErrorMessages: Record<BookingErrorCode, string> = {
  NO_ACTIVE_MEMBERSHIP: "Нет активного абонемента с доступными занятиями",
  NO_VISITS_REMAINING: "В абонементе не осталось занятий для списания",
  SESSION_FULL: "Мест нет",
  SESSION_NOT_AVAILABLE: "Сессия отменена или завершена",
  ALREADY_BOOKED: "Вы уже записаны",
  SESSION_IN_PAST: "Нельзя записаться на прошедшую сессию",
  BOOKING_NOT_FOUND: "Запись не найдена",
  BOOKING_NOT_AVAILABLE: "Запись уже отменена или завершена",
  BOOKING_ALREADY_CONFIRMED: "Посещение уже подтверждено",
  BOOKING_CANCELLED: "Запись отменена",
  FORBIDDEN: "Нельзя отменить чужую запись",
  CANCELLATION_TOO_LATE: "Отмена невозможна слишком близко к началу занятия",
  CONFIRMATION_WINDOW_CLOSED: "QR-код можно подтвердить только рядом со временем занятия",
  NO_SHOW_TOO_EARLY: "Неявку можно отметить только после начала занятия",
  INVALID_QR_TOKEN: "QR-код недействителен или устарел",
  QR_TOKEN_EXPIRED: "QR-код устарел. Обновите код на телефоне клиента",
  DROP_IN_PAYMENT_REQUIRED: "Требуется оплата разового визита",
  DROP_IN_INCONSISTENT_STATE: "Разовый визит в неожиданном состоянии. Обратитесь к администратору.",
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
  | "session"
  | "booking"
  | "membership"
  | "workoutLog"
  | "dropInPass"
  | "gymSettings"
  | "$queryRaw"
>;

type LockedSessionRow = {
  id: string;
  title: string | null;
  startsAt: Date;
  durationMinutes: number;
  capacity: number;
  status: string;
  type: string;
  origin: "manual" | "auto_free";
  dropInEnabled: boolean;
  dropInPrice: Prisma.Decimal | null;
};

type LockedMembershipRow = {
  id: string;
  status: string;
  visitsRemaining: number;
  reservedSessions?: number;
};

type LockedBookingRow = {
  id: string;
  userId: string;
  sessionId: string;
  membershipId: string | null;
  dropInId: string | null;
  status: string;
};

type LockedAttendanceBookingRow = LockedBookingRow & {
  sessionTitle: string | null;
  startsAt: Date;
  durationMinutes: number;
  sessionStatus: string;
  clientFullName: string;
  clientEmail: string;
  visitsRemaining: number | null;
  dropInId: string | null;
  dropInStatus: string | null;
  dropInPrice: Prisma.Decimal | null;
};

export type BookSessionResult = {
  bookingId: string;
  sessionId: string;
  sessionTitle: string | null;
  startsAt: Date;
  durationMinutes: number;
  dropInPassId: string | null;
};

export type CancelBookingResult = {
  bookingId: string;
  sessionId: string;
  sessionTitle: string | null;
  startsAt: Date;
  durationMinutes: number;
  membershipRestored: boolean;
};

export type AttendancePaymentSource = "membership" | "drop_in";

export type AttendanceResult = {
  bookingId: string;
  sessionId: string;
  sessionTitle: string | null;
  startsAt: Date;
  durationMinutes: number;
  clientFullName: string;
  clientEmail: string;
  status: "completed" | "no_show";
  alreadyProcessed: boolean;
  visitsRemaining: number | null;
  paymentSource: AttendancePaymentSource | null;
  dropInPassId: string | null;
};

export type DropInPaymentRequiredDetails = {
  bookingId: string;
  dropInPassId: string;
  clientFullName: string;
  clientEmail: string;
  sessionTitle: string | null;
  startsAt: Date;
  durationMinutes: number;
  price: Prisma.Decimal;
};

export class DropInPaymentRequiredError extends BookingServiceError {
  details: DropInPaymentRequiredDetails;

  constructor(details: DropInPaymentRequiredDetails) {
    super("DROP_IN_PAYMENT_REQUIRED");
    this.name = "DropInPaymentRequiredError";
    this.details = details;
  }
}

type ConfirmAttendanceOptions = {
  method: Exclude<BookingConfirmationMethod, "no_show">;
  now?: Date;
  requireQrWindow?: boolean;
};

function raise(code: BookingErrorCode): never {
  throw new BookingServiceError(code);
}

function isInQrConfirmationWindow(
  startsAt: Date,
  durationMinutes: number,
  now: Date,
) {
  const earliest =
    startsAt.getTime() - QR_CONFIRMATION_BEFORE_START_HOURS * 60 * 60 * 1000;
  const latest =
    startsAt.getTime() +
    (durationMinutes / 60 + QR_CONFIRMATION_AFTER_END_HOURS) * 60 * 60 * 1000;
  const timestamp = now.getTime();

  return timestamp >= earliest && timestamp <= latest;
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
      type,
      origin,
      "dropInEnabled",
      "dropInPrice"
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

async function resolveAutoFreeDropInPrice(
  db: BookingMutationClient,
): Promise<Prisma.Decimal> {
  try {
    const settings = await db.gymSettings.findUnique({
      where: { id: 1 },
      select: { freeSlotDropInPrice: true },
    });
    const price = settings?.freeSlotDropInPrice;

    if (!price || price.lessThan(0)) {
      return new Prisma.Decimal(0);
    }

    return price;
  } catch {
    return new Prisma.Decimal(0);
  }
}

async function lockSessionForCancellation(
  db: BookingMutationClient,
  sessionId: string,
): Promise<
  Pick<LockedSessionRow, "id" | "title" | "startsAt" | "durationMinutes"> & {
    cancellationDeadlineHours: number;
  }
> {
  const rows = await db.$queryRaw<
    Array<
      Pick<LockedSessionRow, "id" | "title" | "startsAt" | "durationMinutes"> & {
        cancellationDeadlineHours: number;
      }
    >
  >(
    Prisma.sql`
      SELECT id, title, "startsAt", "durationMinutes", "cancellationDeadlineHours"
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
    SELECT
      m.id,
      m.status,
      m."visitsRemaining",
      COALESCE((
        SELECT COUNT(*)::int
        FROM "Booking" b
        WHERE b."membershipId" = m.id
          AND b.status = 'pending'
      ), 0) AS "reservedSessions"
    FROM "Membership" m
    WHERE m."userId" = ${userId}
      AND m.status = 'active'
      AND m."startsAt" <= NOW()
      AND m."endsAt" >= NOW()
      AND m."visitsRemaining" > COALESCE((
        SELECT COUNT(*)::int
        FROM "Booking" b
        WHERE b."membershipId" = m.id
          AND b.status = 'pending'
      ), 0)
    ORDER BY m."endsAt" ASC
    LIMIT 1
    FOR UPDATE
  `);

  const membership = rows[0];

  if (!membership) {
    raise("NO_ACTIVE_MEMBERSHIP");
  }

  return membership;
}

async function lockMembershipForDebit(
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
    SELECT id, "userId", "sessionId", "membershipId", "dropInId", status
    FROM "Booking"
    WHERE id = ${bookingId}
    FOR UPDATE
  `);

  return rows[0] ?? null;
}

async function lockAttendanceBooking(
  db: BookingMutationClient,
  bookingId: string,
): Promise<LockedAttendanceBookingRow | null> {
  const rows = await db.$queryRaw<LockedAttendanceBookingRow[]>(Prisma.sql`
    SELECT
      b.id,
      b."userId",
      b."sessionId",
      b."membershipId",
      b."dropInId",
      b.status,
      s.title AS "sessionTitle",
      s."startsAt",
      s."durationMinutes",
      s.status AS "sessionStatus",
      u."fullName" AS "clientFullName",
      u.email AS "clientEmail",
      m."visitsRemaining" AS "visitsRemaining",
      dip.status AS "dropInStatus",
      dip.price AS "dropInPrice"
    FROM "Booking" b
    INNER JOIN "Session" s ON s.id = b."sessionId"
    INNER JOIN "User" u ON u.id = b."userId"
    LEFT JOIN "Membership" m ON m.id = b."membershipId"
    LEFT JOIN "DropInPass" dip ON dip.id = b."dropInId"
    WHERE b.id = ${bookingId}
    FOR UPDATE OF b
  `);

  return rows[0] ?? null;
}

function getPaymentSource(
  booking: LockedAttendanceBookingRow,
): AttendancePaymentSource | null {
  if (booking.dropInId) return "drop_in";
  if (booking.membershipId) return "membership";
  return null;
}

function buildAttendanceResult(
  booking: LockedAttendanceBookingRow,
  status: "completed" | "no_show",
  alreadyProcessed: boolean,
  visitsRemaining = booking.visitsRemaining,
): AttendanceResult {
  return {
    bookingId: booking.id,
    sessionId: booking.sessionId,
    sessionTitle: booking.sessionTitle,
    startsAt: booking.startsAt,
    durationMinutes: booking.durationMinutes,
    clientFullName: booking.clientFullName,
    clientEmail: booking.clientEmail,
    status,
    alreadyProcessed,
    visitsRemaining,
    paymentSource: getPaymentSource(booking),
    dropInPassId: booking.dropInId,
  };
}

async function debitMembershipForAttendance(
  db: BookingMutationClient,
  membershipId: string | null,
) {
  if (!membershipId) {
    raise("NO_ACTIVE_MEMBERSHIP");
  }

  const membership = await lockMembershipForDebit(db, membershipId);

  if (!membership) {
    raise("NO_ACTIVE_MEMBERSHIP");
  }

  if (membership.visitsRemaining <= 0) {
    raise("NO_VISITS_REMAINING");
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

  return membership.visitsRemaining - 1;
}

/**
 * Списание/подтверждение оплаты при confirm attendance.
 * Возвращает остаток визитов по абонементу (или null, если оплата — drop-in).
 * Для pending drop-in бросает DropInPaymentRequiredError — UI-сканер должен
 * предложить принять оплату и повторить операцию.
 */
async function assertAndDebitPaymentForAttendance(
  db: BookingMutationClient,
  booking: LockedAttendanceBookingRow,
): Promise<number | null> {
  if (booking.dropInId) {
    switch (booking.dropInStatus) {
      case "paid":
        return null;
      case "pending":
        if (!booking.dropInPrice) {
          raise("DROP_IN_INCONSISTENT_STATE");
        }
        throw new DropInPaymentRequiredError({
          bookingId: booking.id,
          dropInPassId: booking.dropInId,
          clientFullName: booking.clientFullName,
          clientEmail: booking.clientEmail,
          sessionTitle: booking.sessionTitle,
          startsAt: booking.startsAt,
          durationMinutes: booking.durationMinutes,
          price: booking.dropInPrice,
        });
      case "cancelled":
      case "refunded":
      default:
        raise("DROP_IN_INCONSISTENT_STATE");
    }
  }

  return debitMembershipForAttendance(db, booking.membershipId);
}

/**
 * Обработка оплаты при no_show:
 *   - membership → списываем визит (клиент "потратил" место);
 *   - drop-in paid → без изменений, просто фиксируем no_show;
 *   - drop-in pending → отменяем pass (клиент так и не заплатил).
 */
async function handlePaymentForNoShow(
  db: BookingMutationClient,
  booking: LockedAttendanceBookingRow,
): Promise<number | null> {
  if (booking.dropInId) {
    if (booking.dropInStatus === "pending") {
      await db.dropInPass.update({
        where: { id: booking.dropInId },
        data: {
          status: "cancelled",
          cancelledAt: new Date(),
          cancelReason: "no_show",
        },
      });
    }
    return null;
  }

  return debitMembershipForAttendance(db, booking.membershipId);
}

async function ensureWorkoutLogForAttendance(
  db: BookingMutationClient,
  booking: LockedAttendanceBookingRow,
) {
  await db.workoutLog.upsert({
    where: {
      userId_sessionId: {
        userId: booking.userId,
        sessionId: booking.sessionId,
      },
    },
    update: {},
    create: {
      userId: booking.userId,
      sessionId: booking.sessionId,
      performedAt: booking.startsAt,
      durationMin: booking.durationMinutes,
    },
  });
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

  // Capacity учитывается только по активным бронированиям живых пользователей.
  // Soft-delete пользователя каскадом отменяет pending booking в триггере
  // handle_user_delete, но фильтр здесь защищает от рассинхронизации
  // (историческая запись до миграции, задержка репликации и т.п.).
  const currentBookings = await db.booking.count({
    where: {
      sessionId,
      status: {
        in: [...activeBookingStatuses],
      },
      user: {
        is: {
          deletedAt: null,
        },
      },
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

  if (
    existingBooking?.status === "pending" ||
    existingBooking?.status === "completed" ||
    existingBooking?.status === "no_show"
  ) {
    raise("ALREADY_BOOKED");
  }

  const bookedAt = now;
  let bookingId: string;
  let membershipId: string | null = null;
  let dropInId: string | null = null;

  try {
    const membership = await lockMembershipForBooking(db, userId);
    membershipId = membership.id;
  } catch (error) {
    const isAutoFreeDropIn = session.origin === "auto_free";
    const canUseDropIn = session.dropInEnabled || isAutoFreeDropIn;

    if (
      error instanceof BookingServiceError &&
      error.code === "NO_ACTIVE_MEMBERSHIP" &&
      canUseDropIn
    ) {
      const dropInPrice = isAutoFreeDropIn
        ? await resolveAutoFreeDropInPrice(db)
        : (session.dropInPrice ?? new Prisma.Decimal(0));

      // Create a pending drop-in pass
      const dropInPass = await db.dropInPass.create({
        data: {
          userId,
          sessionId,
          price: dropInPrice,
          status: "pending",
        },
      });
      dropInId = dropInPass.id;
    } else {
      throw error;
    }
  }

  if (existingBooking?.status === "cancelled") {
    const booking = await db.booking.update({
      where: {
        id: existingBooking.id,
      },
      data: {
        status: "pending",
        bookedAt,
        cancelledAt: null,
        cancelReason: null,
        confirmedAt: null,
        confirmedById: null,
        confirmationMethod: null,
        membershipId,
        dropInId,
      },
    });

    bookingId = booking.id;
  } else {
    const booking = await db.booking.create({
      data: {
        userId,
        sessionId,
        membershipId,
        dropInId,
        status: "pending",
        bookedAt,
      },
    });

    bookingId = booking.id;
  }

  return {
    bookingId,
    sessionId: session.id,
    sessionTitle: session.title,
    startsAt: session.startsAt,
    durationMinutes: session.durationMinutes,
    dropInPassId: dropInId,
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

  if (booking.status !== "pending") {
    raise("BOOKING_NOT_AVAILABLE");
  }

  const session = await lockSessionForCancellation(db, booking.sessionId);

  const hoursUntilStart =
    (session.startsAt.getTime() - now.getTime()) / (60 * 60 * 1000);

  if (hoursUntilStart < session.cancellationDeadlineHours) {
    throw new BookingServiceError(
      "CANCELLATION_TOO_LATE",
      `Отмена невозможна менее чем за ${session.cancellationDeadlineHours} ч до начала`,
    );
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

  // Если бронь была по drop-in и оплата ещё не принята — отменяем pass.
  // Paid pass оставляем в paid: клиент фактически уже заплатил и должен
  // обращаться к администратору за возвратом.
  if (booking.dropInId) {
    await db.dropInPass.updateMany({
      where: {
        id: booking.dropInId,
        status: "pending",
      },
      data: {
        status: "cancelled",
        cancelledAt,
        cancelReason: "client_cancelled",
      },
    });
  }

  return {
    bookingId: booking.id,
    sessionId: session.id,
    sessionTitle: session.title,
    startsAt: session.startsAt,
    durationMinutes: session.durationMinutes,
    membershipRestored: false,
  };
}

export async function confirmAttendanceForBooking(
  db: BookingMutationClient,
  bookingId: string,
  actorId: string,
  options: ConfirmAttendanceOptions = { method: "manual" },
): Promise<AttendanceResult> {
  const now = options.now ?? new Date();
  const booking = await lockAttendanceBooking(db, bookingId);

  if (!booking) {
    raise("BOOKING_NOT_FOUND");
  }

  if (booking.status === "completed") {
    await ensureWorkoutLogForAttendance(db, booking);
    return buildAttendanceResult(booking, "completed", true);
  }

  if (booking.status === "cancelled") {
    raise("BOOKING_CANCELLED");
  }

  if (booking.status === "no_show") {
    raise("BOOKING_NOT_AVAILABLE");
  }

  if (booking.status !== "pending") {
    raise("BOOKING_NOT_AVAILABLE");
  }

  if (booking.sessionStatus === "cancelled") {
    raise("SESSION_NOT_AVAILABLE");
  }

  if (
    options.requireQrWindow &&
    !isInQrConfirmationWindow(booking.startsAt, booking.durationMinutes, now)
  ) {
    raise("CONFIRMATION_WINDOW_CLOSED");
  }

  const visitsRemaining = await assertAndDebitPaymentForAttendance(db, booking);

  await db.booking.update({
    where: {
      id: booking.id,
    },
    data: {
      status: "completed",
      confirmedAt: now,
      confirmedById: actorId,
      confirmationMethod: options.method,
    },
  });

  await ensureWorkoutLogForAttendance(db, booking);

  return buildAttendanceResult(booking, "completed", false, visitsRemaining);
}

export async function markNoShowForBooking(
  db: BookingMutationClient,
  bookingId: string,
  actorId: string,
  now = new Date(),
): Promise<AttendanceResult> {
  const booking = await lockAttendanceBooking(db, bookingId);

  if (!booking) {
    raise("BOOKING_NOT_FOUND");
  }

  if (booking.status === "no_show") {
    return buildAttendanceResult(booking, "no_show", true);
  }

  if (booking.status === "completed") {
    raise("BOOKING_ALREADY_CONFIRMED");
  }

  if (booking.status === "cancelled") {
    raise("BOOKING_CANCELLED");
  }

  if (booking.status !== "pending") {
    raise("BOOKING_NOT_AVAILABLE");
  }

  if (booking.startsAt.getTime() > now.getTime()) {
    raise("NO_SHOW_TOO_EARLY");
  }

  const visitsRemaining = await handlePaymentForNoShow(db, booking);

  await db.booking.update({
    where: {
      id: booking.id,
    },
    data: {
      status: "no_show",
      confirmedAt: now,
      confirmedById: actorId,
      confirmationMethod: "no_show",
    },
  });

  return buildAttendanceResult(booking, "no_show", false, visitsRemaining);
}
