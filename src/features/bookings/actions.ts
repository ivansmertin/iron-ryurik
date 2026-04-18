"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireUser, requireUserRole } from "@/features/auth/get-user";
import {
  sendBestEffortEmails,
  sendBookingCancellationEmail,
  sendBookingConfirmationEmail,
} from "@/lib/email/notifications";
import { prisma } from "@/lib/prisma";
import {
  BookingServiceError,
  bookingErrorMessages,
  bookSessionForUser,
  cancelBookingForUser,
  confirmAttendanceForBooking,
  markNoShowForBooking,
  type AttendanceResult,
  type BookingErrorCode,
  type BookSessionResult,
  type CancelBookingResult,
} from "./service";
import {
  BOOKING_QR_TOKEN_TTL_MS,
  createBookingQrToken,
  verifyBookingQrToken,
} from "./qr";
import { updateGymOccupancy } from "@/features/gym-state/service";

export type BookingActionSuccess = {
  ok: true;
  bookingId: string;
  sessionId: string;
  sessionTitle: string | null;
  startsAt: string;
  durationMinutes: number;
  dropInPassId: string | null;
};

export type BookingActionError = {
  ok: false;
  error: string;
  code: BookingErrorCode;
};

export type BookingActionState =
  | BookingActionSuccess
  | BookingActionError
  | undefined;

export type BookingQrTokenActionState =
  | {
      ok: true;
      token: string;
      expiresAt: string;
    }
  | BookingActionError;

export type AttendanceActionSuccess = BookingActionSuccess & {
  clientFullName: string;
  clientEmail: string;
  status: "completed" | "no_show";
  alreadyProcessed: boolean;
  visitsRemaining: number | null;
};

export type AttendanceActionState =
  | AttendanceActionSuccess
  | BookingActionError
  | undefined;

function toSuccessState(
  result: BookSessionResult | CancelBookingResult,
): BookingActionSuccess {
  return {
    ok: true,
    bookingId: result.bookingId,
    sessionId: result.sessionId,
    sessionTitle: result.sessionTitle,
    startsAt: result.startsAt.toISOString(),
    durationMinutes: result.durationMinutes,
    dropInPassId: (result as BookSessionResult).dropInPassId ?? null,
  };
}

function toAttendanceSuccessState(
  result: AttendanceResult,
): AttendanceActionSuccess {
  return {
    ...toSuccessState(result),
    clientFullName: result.clientFullName,
    clientEmail: result.clientEmail,
    status: result.status,
    alreadyProcessed: result.alreadyProcessed,
    visitsRemaining: result.visitsRemaining,
  };
}

function toErrorState(error: unknown): BookingActionError {
  if (error instanceof BookingServiceError) {
    return {
      ok: false,
      code: error.code,
      error: error.message || bookingErrorMessages[error.code],
    };
  }

  return {
    ok: false,
    code: "INTERNAL_ERROR",
    error: bookingErrorMessages.INTERNAL_ERROR,
  };
}

function revalidateBookingViews() {
  revalidatePath("/client");
  revalidatePath("/client/schedule");
  revalidatePath("/client/bookings");
  revalidatePath("/admin");
  revalidatePath("/admin/scan");
  revalidatePath("/admin/schedule");
  revalidatePath("/trainer");
  revalidatePath("/trainer/scan");
  revalidatePath("/trainer/schedule");
}

async function incrementGymOccupancyForAttendance(result: AttendanceResult) {
  if (result.alreadyProcessed || result.status !== "completed") {
    return;
  }

  try {
    await updateGymOccupancy({ delta: 1 });
  } catch (error) {
    console.error(
      "[bookings.actions] failed to increment gym occupancy after check-in",
      error,
    );
  }
}

export async function bookSession(
  sessionId: string,
  prevState: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  void prevState;
  void formData;

  const user = await requireUser("client");

  try {
    const result = await prisma.$transaction(
      (tx) => bookSessionForUser(tx, user.id, sessionId),
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      },
    );

    revalidateBookingViews();

    await sendBestEffortEmails(
      [
        sendBookingConfirmationEmail({
          to: user.email,
          fullName: user.fullName,
          sessionTitle: result.sessionTitle,
          startsAt: result.startsAt,
          durationMinutes: result.durationMinutes,
        }),
      ],
      "bookSession",
    );

    return toSuccessState(result);
  } catch (error) {
    return toErrorState(error);
  }
}

export async function cancelBooking(
  bookingId: string,
  prevState: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  void prevState;
  void formData;

  const user = await requireUser("client");

  try {
    const result = await prisma.$transaction(
      (tx) => cancelBookingForUser(tx, user.id, bookingId),
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      },
    );

    revalidateBookingViews();

    await sendBestEffortEmails(
      [
        sendBookingCancellationEmail({
          to: user.email,
          fullName: user.fullName,
          sessionTitle: result.sessionTitle,
          startsAt: result.startsAt,
          durationMinutes: result.durationMinutes,
          membershipRestored: result.membershipRestored,
        }),
      ],
      "cancelBooking",
    );

    return toSuccessState(result);
  } catch (error) {
    return toErrorState(error);
  }
}

export async function getBookingQrToken(
  bookingId: string,
): Promise<BookingQrTokenActionState> {
  const user = await requireUser("client");

  try {
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        userId: user.id,
        status: "pending",
      },
      select: {
        id: true,
        userId: true,
        sessionId: true,
        session: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!booking || booking.session.status === "cancelled") {
      throw new BookingServiceError("BOOKING_NOT_AVAILABLE");
    }

    const now = new Date();

    return {
      ok: true,
      token: createBookingQrToken({
        bookingId: booking.id,
        userId: booking.userId,
        sessionId: booking.sessionId,
        now,
      }),
      expiresAt: new Date(
        now.getTime() + BOOKING_QR_TOKEN_TTL_MS,
      ).toISOString(),
    };
  } catch (error) {
    return toErrorState(error);
  }
}

export async function confirmAttendance(
  bookingId: string,
): Promise<AttendanceActionState> {
  const actor = await requireUserRole(["admin", "trainer"]);

  try {
    const result = await prisma.$transaction(
      (tx) =>
        confirmAttendanceForBooking(tx, bookingId, actor.id, {
          method: "manual",
        }),
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      },
    );

    await incrementGymOccupancyForAttendance(result);
    revalidateBookingViews();

    return toAttendanceSuccessState(result);
  } catch (error) {
    return toErrorState(error);
  }
}

export async function confirmAttendanceFromQr(
  token: string,
): Promise<AttendanceActionState> {
  const actor = await requireUserRole(["admin", "trainer"]);

  try {
    const verifiedToken = verifyBookingQrToken(token);

    const result = await prisma.$transaction(
      async (tx) => {
        const booking = await tx.booking.findUnique({
          where: {
            id: verifiedToken.bookingId,
          },
          select: {
            userId: true,
            sessionId: true,
          },
        });

        if (
          !booking ||
          booking.userId !== verifiedToken.userId ||
          booking.sessionId !== verifiedToken.sessionId
        ) {
          throw new BookingServiceError("INVALID_QR_TOKEN");
        }

        return confirmAttendanceForBooking(
          tx,
          verifiedToken.bookingId,
          actor.id,
          {
            method: "qr",
            requireQrWindow: true,
          },
        );
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      },
    );

    await incrementGymOccupancyForAttendance(result);
    revalidateBookingViews();

    return toAttendanceSuccessState(result);
  } catch (error) {
    return toErrorState(error);
  }
}

export async function markBookingNoShow(
  bookingId: string,
): Promise<AttendanceActionState> {
  const actor = await requireUserRole(["admin", "trainer"]);

  try {
    const result = await prisma.$transaction(
      (tx) => markNoShowForBooking(tx, bookingId, actor.id),
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      },
    );

    revalidateBookingViews();

    return toAttendanceSuccessState(result);
  } catch (error) {
    return toErrorState(error);
  }
}
