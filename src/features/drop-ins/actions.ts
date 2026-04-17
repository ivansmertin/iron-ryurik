"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireUser, requireUserRole } from "@/features/auth/get-user";
import { prisma } from "@/lib/prisma";
import {
  DropInServiceError,
  dropInErrorMessages,
  bookSessionAsDropIn,
  markDropInPassPaid,
  cancelDropInPass,
  refundDropInPass,
  createWalkInDropIn,
  type DropInErrorCode,
  type BookSessionAsDropInResult,
  type MarkDropInPaidResult,
  type CancelDropInResult,
  type RefundDropInResult,
  type CreateWalkInDropInResult,
} from "./service";
import { updateGymOccupancy } from "@/features/gym-state/service";

// ────────────────────────────────────────────────
// Result types
// ────────────────────────────────────────────────

export type DropInActionError = {
  ok: false;
  error: string;
  code: DropInErrorCode;
};

export type DropInBookActionSuccess = {
  ok: true;
  bookingId: string;
  dropInPassId: string;
  sessionId: string;
  sessionTitle: string | null;
  startsAt: string;
  durationMinutes: number;
  price: string;
};

export type DropInBookActionState =
  | DropInBookActionSuccess
  | DropInActionError
  | undefined;

export type DropInPaidActionSuccess = {
  ok: true;
  dropInPassId: string;
  bookingId: string | null;
  price: string;
  paidAmount: string;
  paidAt: string;
};

export type DropInPaidActionState =
  | DropInPaidActionSuccess
  | DropInActionError
  | undefined;

export type DropInCancelActionSuccess = {
  ok: true;
  dropInPassId: string;
  bookingId: string | null;
};

export type DropInCancelActionState =
  | DropInCancelActionSuccess
  | DropInActionError
  | undefined;

export type DropInRefundActionSuccess = {
  ok: true;
  dropInPassId: string;
};

export type DropInRefundActionState =
  | DropInRefundActionSuccess
  | DropInActionError
  | undefined;

export type WalkInDropInActionSuccess = {
  ok: true;
  dropInPassId: string;
  userId: string;
  paidAmount: string;
  paidAt: string;
};

export type WalkInDropInActionState =
  | WalkInDropInActionSuccess
  | DropInActionError
  | undefined;

// ────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────

function revalidateBookingViews() {
  revalidatePath("/client");
  revalidatePath("/client/schedule");
  revalidatePath("/client/bookings");
  revalidatePath("/admin");
  revalidatePath("/admin/scan");
  revalidatePath("/admin/schedule");
  revalidatePath("/admin/drop-ins");
  revalidatePath("/trainer");
  revalidatePath("/trainer/scan");
}

function toErrorState(error: unknown): DropInActionError {
  if (error instanceof DropInServiceError) {
    return {
      ok: false,
      code: error.code,
      error: error.message || dropInErrorMessages[error.code],
    };
  }

  return {
    ok: false,
    code: "INTERNAL_ERROR",
    error: dropInErrorMessages.INTERNAL_ERROR,
  };
}

function toBookSuccess(result: BookSessionAsDropInResult): DropInBookActionSuccess {
  return {
    ok: true,
    bookingId: result.bookingId,
    dropInPassId: result.dropInPassId,
    sessionId: result.sessionId,
    sessionTitle: result.sessionTitle,
    startsAt: result.startsAt.toISOString(),
    durationMinutes: result.durationMinutes,
    price: result.price.toString(),
  };
}

function toPaidSuccess(result: MarkDropInPaidResult): DropInPaidActionSuccess {
  return {
    ok: true,
    dropInPassId: result.dropInPassId,
    bookingId: result.bookingId,
    price: result.price.toString(),
    paidAmount: result.paidAmount.toString(),
    paidAt: result.paidAt.toISOString(),
  };
}

function toCancelSuccess(result: CancelDropInResult): DropInCancelActionSuccess {
  return {
    ok: true,
    dropInPassId: result.dropInPassId,
    bookingId: result.bookingId,
  };
}

function toRefundSuccess(result: RefundDropInResult): DropInRefundActionSuccess {
  return {
    ok: true,
    dropInPassId: result.dropInPassId,
  };
}

function toWalkInSuccess(result: CreateWalkInDropInResult): WalkInDropInActionSuccess {
  return {
    ok: true,
    dropInPassId: result.dropInPassId,
    userId: result.userId,
    paidAmount: result.paidAmount.toString(),
    paidAt: result.paidAt.toISOString(),
  };
}

// ────────────────────────────────────────────────
// Actions
// ────────────────────────────────────────────────

/**
 * Клиент записывается на сессию разово (без абонемента).
 * Создаёт DropInPass (pending) + Booking (pending).
 */
export async function bookSessionDropIn(
  sessionId: string,
): Promise<DropInBookActionState> {
  const user = await requireUser("client");

  try {
    const result = await prisma.$transaction(
      (tx) => bookSessionAsDropIn(tx, user.id, sessionId),
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      },
    );

    revalidateBookingViews();
    return toBookSuccess(result);
  } catch (error) {
    return toErrorState(error);
  }
}

/**
 * Тренер/админ подтверждает приём оплаты за разовый визит.
 * Переводит DropInPass pending → paid.
 */
export async function markDropInPaid(
  passId: string,
  options?: { paidAmount?: string },
): Promise<DropInPaidActionState> {
  const actor = await requireUserRole(["admin", "trainer"]);

  try {
    const result = await prisma.$transaction(
      (tx) =>
        markDropInPassPaid(tx, passId, actor.id, {
          paidAmount: options?.paidAmount,
        }),
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      },
    );

    revalidateBookingViews();
    return toPaidSuccess(result);
  } catch (error) {
    return toErrorState(error);
  }
}

/**
 * Тренер/админ подтверждает приём оплаты за drop-in И отмечает посещение.
 * Одна транзакция: DropInPass → paid, Booking → completed, occupancy +1.
 */
export async function markDropInPaidAndConfirmAttendance(
  passId: string,
  bookingId: string,
  options?: { paidAmount?: string },
): Promise<DropInPaidActionState> {
  const actor = await requireUserRole(["admin", "trainer"]);

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const paidResult = await markDropInPassPaid(tx, passId, actor.id, {
          paidAmount: options?.paidAmount,
        });

        // Подтверждаем посещение — booking → completed
        const { confirmAttendanceForBooking } = await import(
          "@/features/bookings/service"
        );
        await confirmAttendanceForBooking(tx, bookingId, actor.id, {
          method: "manual",
        });

        return paidResult;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      },
    );

    // Occupancy +1
    try {
      await updateGymOccupancy({ delta: 1 });
    } catch (err) {
      console.error(
        "[drop-ins.actions] failed to increment gym occupancy after paid+attend",
        err,
      );
    }

    revalidateBookingViews();
    return toPaidSuccess(result);
  } catch (error) {
    return toErrorState(error);
  }
}

/**
 * Клиент отменяет свой pending drop-in.
 */
export async function cancelDropIn(
  passId: string,
  reason?: string,
): Promise<DropInCancelActionState> {
  const user = await requireUser("client");

  try {
    // Проверим, что pass принадлежит клиенту
    const pass = await prisma.dropInPass.findUnique({
      where: { id: passId },
      select: { userId: true, status: true },
    });

    if (!pass || pass.userId !== user.id) {
      return {
        ok: false,
        code: "DROP_IN_NOT_FOUND",
        error: dropInErrorMessages.DROP_IN_NOT_FOUND,
      };
    }

    const result = await prisma.$transaction(
      (tx) =>
        cancelDropInPass(tx, passId, {
          reason: reason ?? "client_cancelled",
        }),
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      },
    );

    revalidateBookingViews();
    return toCancelSuccess(result);
  } catch (error) {
    return toErrorState(error);
  }
}

/**
 * Админ отменяет любой drop-in pass (в т.ч. оплаченный).
 */
export async function adminCancelDropIn(
  passId: string,
  reason?: string,
): Promise<DropInCancelActionState> {
  await requireUserRole(["admin"]);

  try {
    const result = await prisma.$transaction(
      (tx) =>
        cancelDropInPass(tx, passId, {
          reason: reason ?? "admin_cancelled",
          allowPaid: true,
        }),
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      },
    );

    revalidateBookingViews();
    return toCancelSuccess(result);
  } catch (error) {
    return toErrorState(error);
  }
}

/**
 * Админ оформляет возврат за оплаченный drop-in.
 */
export async function refundDropIn(
  passId: string,
  reason?: string,
): Promise<DropInRefundActionState> {
  const actor = await requireUserRole(["admin"]);

  try {
    const result = await prisma.$transaction(
      (tx) =>
        refundDropInPass(tx, passId, actor.id, {
          reason,
        }),
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      },
    );

    revalidateBookingViews();
    return toRefundSuccess(result);
  } catch (error) {
    return toErrorState(error);
  }
}

/**
 * Тренер/админ оформляет walk-in: клиент пришёл без записи,
 * оплатил на ресепшене. Не создаёт Booking — просто финансовая запись.
 */
export async function createWalkIn(
  userId: string,
  options?: {
    sessionId?: string;
    price?: string;
    paidAmount?: string;
  },
): Promise<WalkInDropInActionState> {
  const actor = await requireUserRole(["admin", "trainer"]);

  try {
    const result = await prisma.$transaction(
      (tx) =>
        createWalkInDropIn(tx, {
          userId,
          actorId: actor.id,
          sessionId: options?.sessionId,
          price: options?.price,
          paidAmount: options?.paidAmount,
        }),
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      },
    );

    // Walk-in тоже увеличивает occupancy
    try {
      await updateGymOccupancy({ delta: 1 });
    } catch (err) {
      console.error(
        "[drop-ins.actions] failed to increment gym occupancy after walk-in",
        err,
      );
    }

    revalidateBookingViews();
    return toWalkInSuccess(result);
  } catch (error) {
    return toErrorState(error);
  }
}
