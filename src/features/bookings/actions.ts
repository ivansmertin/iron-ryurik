"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/features/auth/get-user";
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
  type BookingErrorCode,
  type BookSessionResult,
  type CancelBookingResult,
} from "./service";

export type BookingActionSuccess = {
  ok: true;
  bookingId: string;
  sessionId: string;
  sessionTitle: string | null;
  startsAt: string;
  durationMinutes: number;
};

export type BookingActionError = {
  ok: false;
  error: string;
  code: BookingErrorCode;
};

export type BookingActionState = BookingActionSuccess | BookingActionError | undefined;

function toSuccessState(result: BookSessionResult | CancelBookingResult): BookingActionSuccess {
  return {
    ok: true,
    bookingId: result.bookingId,
    sessionId: result.sessionId,
    sessionTitle: result.sessionTitle,
    startsAt: result.startsAt.toISOString(),
    durationMinutes: "durationMinutes" in result ? result.durationMinutes : 0,
  };
}

function toErrorState(error: unknown): BookingActionError {
  if (error instanceof BookingServiceError) {
    return {
      ok: false,
      code: error.code,
      error: bookingErrorMessages[error.code],
    };
  }

  return {
    ok: false,
    code: "INTERNAL_ERROR",
    error: bookingErrorMessages.INTERNAL_ERROR,
  };
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
        // FOR UPDATE on the session row is the actual race-condition guard.
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      },
    );

    revalidatePath("/client");
    revalidatePath("/client/schedule");
    revalidatePath("/client/bookings");

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

    revalidatePath("/client");
    revalidatePath("/client/schedule");
    revalidatePath("/client/bookings");

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
