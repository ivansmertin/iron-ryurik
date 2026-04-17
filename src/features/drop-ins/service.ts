import { Prisma } from "@prisma/client";
import { activeBookingStatuses } from "@/features/bookings/service";

export type DropInErrorCode =
  | "DROP_IN_NOT_AVAILABLE"
  | "DROP_IN_PRICE_NOT_SET"
  | "DROP_IN_NOT_FOUND"
  | "DROP_IN_NOT_PENDING"
  | "DROP_IN_ALREADY_PAID"
  | "DROP_IN_NOT_PAID"
  | "DROP_IN_ALREADY_CANCELLED"
  | "DROP_IN_ALREADY_REFUNDED"
  | "SESSION_NOT_AVAILABLE"
  | "SESSION_IN_PAST"
  | "SESSION_FULL"
  | "ALREADY_BOOKED"
  | "FREE_SLOT_PRICE_NOT_SET"
  | "INTERNAL_ERROR";

export const dropInErrorMessages: Record<DropInErrorCode, string> = {
  DROP_IN_NOT_AVAILABLE: "Разовая оплата для этой сессии недоступна",
  DROP_IN_PRICE_NOT_SET: "Тренер не выставил разовую цену для этой сессии",
  DROP_IN_NOT_FOUND: "Разовый визит не найден",
  DROP_IN_NOT_PENDING: "Разовый визит уже обработан",
  DROP_IN_ALREADY_PAID: "Разовый визит уже оплачен",
  DROP_IN_NOT_PAID: "Разовый визит ещё не оплачен",
  DROP_IN_ALREADY_CANCELLED: "Разовый визит уже отменён",
  DROP_IN_ALREADY_REFUNDED: "По разовому визиту уже был возврат",
  SESSION_NOT_AVAILABLE: "Сессия отменена или завершена",
  SESSION_IN_PAST: "Нельзя оформить разовую бронь на прошедшую сессию",
  SESSION_FULL: "Мест нет",
  ALREADY_BOOKED: "Вы уже записаны на эту сессию",
  FREE_SLOT_PRICE_NOT_SET:
    "Цена свободной тренировки не настроена. Задайте её в настройках зала.",
  INTERNAL_ERROR: "Не удалось выполнить операцию",
};

export class DropInServiceError extends Error {
  code: DropInErrorCode;

  constructor(code: DropInErrorCode, message = dropInErrorMessages[code]) {
    super(message);
    this.name = "DropInServiceError";
    this.code = code;
  }
}

function raise(code: DropInErrorCode): never {
  throw new DropInServiceError(code);
}

export type DropInMutationClient = Pick<
  Prisma.TransactionClient,
  "session" | "booking" | "dropInPass" | "gymSettings" | "$queryRaw"
>;

type LockedSessionForDropInRow = {
  id: string;
  title: string | null;
  startsAt: Date;
  durationMinutes: number;
  capacity: number;
  status: string;
  type: string;
  origin: string;
  dropInPrice: Prisma.Decimal | null;
  dropInEnabled: boolean;
};

type LockedDropInRow = {
  id: string;
  userId: string;
  sessionId: string | null;
  status: string;
  price: Prisma.Decimal;
  bookingId: string | null;
};

async function lockSessionForDropIn(
  db: DropInMutationClient,
  sessionId: string,
): Promise<LockedSessionForDropInRow> {
  const rows = await db.$queryRaw<LockedSessionForDropInRow[]>(Prisma.sql`
    SELECT
      id,
      title,
      "startsAt",
      "durationMinutes",
      capacity,
      status,
      type,
      origin,
      "dropInPrice",
      "dropInEnabled"
    FROM "Session"
    WHERE id = ${sessionId}
    FOR UPDATE
  `);

  const session = rows[0];

  if (!session || session.status !== "scheduled") {
    raise("SESSION_NOT_AVAILABLE");
  }

  return session;
}

async function lockDropInPass(
  db: DropInMutationClient,
  passId: string,
): Promise<LockedDropInRow | null> {
  const rows = await db.$queryRaw<LockedDropInRow[]>(Prisma.sql`
    SELECT
      dip.id,
      dip."userId",
      dip."sessionId",
      dip.status,
      dip.price,
      b.id AS "bookingId"
    FROM "DropInPass" dip
    LEFT JOIN "Booking" b ON b."dropInId" = dip.id
    WHERE dip.id = ${passId}
    FOR UPDATE OF dip
  `);

  return rows[0] ?? null;
}

async function resolveDropInPriceForSession(
  db: DropInMutationClient,
  session: LockedSessionForDropInRow,
): Promise<Prisma.Decimal> {
  if (session.origin === "auto_free") {
    const settings = await db.gymSettings.findUnique({
      where: { id: 1 },
      select: { freeSlotDropInPrice: true },
    });
    const price = settings?.freeSlotDropInPrice;
    if (!price || price.lessThanOrEqualTo(0)) {
      raise("FREE_SLOT_PRICE_NOT_SET");
    }
    return price;
  }

  if (!session.dropInEnabled) {
    raise("DROP_IN_NOT_AVAILABLE");
  }

  if (!session.dropInPrice || session.dropInPrice.lessThanOrEqualTo(0)) {
    raise("DROP_IN_PRICE_NOT_SET");
  }

  return session.dropInPrice;
}

export type BookSessionAsDropInResult = {
  bookingId: string;
  dropInPassId: string;
  sessionId: string;
  sessionTitle: string | null;
  startsAt: Date;
  durationMinutes: number;
  price: Prisma.Decimal;
};

export async function bookSessionAsDropIn(
  db: DropInMutationClient,
  userId: string,
  sessionId: string,
  now = new Date(),
): Promise<BookSessionAsDropInResult> {
  const session = await lockSessionForDropIn(db, sessionId);

  if (session.startsAt.getTime() <= now.getTime()) {
    raise("SESSION_IN_PAST");
  }

  const price = await resolveDropInPriceForSession(db, session);

  // Capacity считается по тем же активным статусам, что и membership-бронь
  // (см. bookings/service.ts). Исключаем удалённых пользователей.
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
      dropInId: true,
    },
  });

  if (
    existingBooking?.status === "pending" ||
    existingBooking?.status === "completed" ||
    existingBooking?.status === "no_show"
  ) {
    raise("ALREADY_BOOKED");
  }

  const pass = await db.dropInPass.create({
    data: {
      userId,
      sessionId,
      price,
      status: "pending",
    },
  });

  let bookingId: string;

  if (existingBooking?.status === "cancelled") {
    const updated = await db.booking.update({
      where: { id: existingBooking.id },
      data: {
        status: "pending",
        bookedAt: now,
        cancelledAt: null,
        cancelReason: null,
        confirmedAt: null,
        confirmedById: null,
        confirmationMethod: null,
        membershipId: null,
        dropInId: pass.id,
      },
    });
    bookingId = updated.id;
  } else {
    const created = await db.booking.create({
      data: {
        userId,
        sessionId,
        membershipId: null,
        dropInId: pass.id,
        status: "pending",
        bookedAt: now,
      },
    });
    bookingId = created.id;
  }

  return {
    bookingId,
    dropInPassId: pass.id,
    sessionId: session.id,
    sessionTitle: session.title,
    startsAt: session.startsAt,
    durationMinutes: session.durationMinutes,
    price,
  };
}

export type MarkDropInPaidResult = {
  dropInPassId: string;
  bookingId: string | null;
  price: Prisma.Decimal;
  paidAmount: Prisma.Decimal;
  paidAt: Date;
};

export async function markDropInPassPaid(
  db: DropInMutationClient,
  passId: string,
  actorId: string,
  options: {
    paidAmount?: Prisma.Decimal | number | string;
    now?: Date;
  } = {},
): Promise<MarkDropInPaidResult> {
  const pass = await lockDropInPass(db, passId);

  if (!pass) {
    raise("DROP_IN_NOT_FOUND");
  }

  if (pass.status === "paid") {
    raise("DROP_IN_ALREADY_PAID");
  }

  if (pass.status === "cancelled") {
    raise("DROP_IN_ALREADY_CANCELLED");
  }

  if (pass.status === "refunded") {
    raise("DROP_IN_ALREADY_REFUNDED");
  }

  if (pass.status !== "pending") {
    raise("DROP_IN_NOT_PENDING");
  }

  const now = options.now ?? new Date();
  const paidAmount =
    options.paidAmount === undefined
      ? pass.price
      : new Prisma.Decimal(options.paidAmount);

  await db.dropInPass.update({
    where: { id: pass.id },
    data: {
      status: "paid",
      paidAt: now,
      paidAmount,
      paidById: actorId,
    },
  });

  return {
    dropInPassId: pass.id,
    bookingId: pass.bookingId,
    price: pass.price,
    paidAmount,
    paidAt: now,
  };
}

export type CancelDropInResult = {
  dropInPassId: string;
  bookingId: string | null;
};

export async function cancelDropInPass(
  db: DropInMutationClient,
  passId: string,
  options: {
    reason?: string;
    now?: Date;
    allowPaid?: boolean;
  } = {},
): Promise<CancelDropInResult> {
  const pass = await lockDropInPass(db, passId);

  if (!pass) {
    raise("DROP_IN_NOT_FOUND");
  }

  if (pass.status === "cancelled") {
    raise("DROP_IN_ALREADY_CANCELLED");
  }

  if (pass.status === "refunded") {
    raise("DROP_IN_ALREADY_REFUNDED");
  }

  if (pass.status === "paid" && !options.allowPaid) {
    raise("DROP_IN_ALREADY_PAID");
  }

  const now = options.now ?? new Date();

  await db.dropInPass.update({
    where: { id: pass.id },
    data: {
      status: "cancelled",
      cancelledAt: now,
      cancelReason: options.reason ?? null,
    },
  });

  if (pass.bookingId) {
    await db.booking.update({
      where: { id: pass.bookingId },
      data: {
        status: "cancelled",
        cancelledAt: now,
        cancelReason: options.reason ?? "drop_in_cancelled",
      },
    });
  }

  return {
    dropInPassId: pass.id,
    bookingId: pass.bookingId,
  };
}

export type RefundDropInResult = {
  dropInPassId: string;
};

export async function refundDropInPass(
  db: DropInMutationClient,
  passId: string,
  actorId: string,
  options: {
    now?: Date;
    reason?: string;
  } = {},
): Promise<RefundDropInResult> {
  const pass = await lockDropInPass(db, passId);

  if (!pass) {
    raise("DROP_IN_NOT_FOUND");
  }

  if (pass.status === "refunded") {
    raise("DROP_IN_ALREADY_REFUNDED");
  }

  if (pass.status !== "paid") {
    raise("DROP_IN_NOT_PAID");
  }

  const now = options.now ?? new Date();

  await db.dropInPass.update({
    where: { id: pass.id },
    data: {
      status: "refunded",
      refundedAt: now,
      refundedById: actorId,
      cancelReason: options.reason ?? null,
    },
  });

  return { dropInPassId: pass.id };
}

export type CreateWalkInDropInResult = {
  dropInPassId: string;
  userId: string;
  paidAmount: Prisma.Decimal;
  paidAt: Date;
};

/**
 * Оформление разового визита "с ресепшена" без предварительной брони.
 * Используется, когда клиент пришёл на свободную тренировку напрямую:
 * тренер/админ фиксирует факт прихода + оплаты одной операцией.
 * Не создаёт Booking — это просто финансовая запись + учёт occupancy.
 */
export async function createWalkInDropIn(
  db: DropInMutationClient,
  params: {
    userId: string;
    actorId: string;
    sessionId?: string | null;
    price?: Prisma.Decimal | number | string;
    paidAmount?: Prisma.Decimal | number | string;
    now?: Date;
  },
): Promise<CreateWalkInDropInResult> {
  const now = params.now ?? new Date();

  let price: Prisma.Decimal;

  if (params.price !== undefined) {
    price = new Prisma.Decimal(params.price);
  } else {
    const settings = await db.gymSettings.findUnique({
      where: { id: 1 },
      select: { freeSlotDropInPrice: true },
    });
    if (!settings?.freeSlotDropInPrice || settings.freeSlotDropInPrice.lessThanOrEqualTo(0)) {
      raise("FREE_SLOT_PRICE_NOT_SET");
    }
    price = settings.freeSlotDropInPrice;
  }

  const paidAmount =
    params.paidAmount === undefined ? price : new Prisma.Decimal(params.paidAmount);

  const pass = await db.dropInPass.create({
    data: {
      userId: params.userId,
      sessionId: params.sessionId ?? null,
      price,
      status: "paid",
      paidAt: now,
      paidAmount,
      paidById: params.actorId,
    },
  });

  return {
    dropInPassId: pass.id,
    userId: params.userId,
    paidAmount,
    paidAt: now,
  };
}
