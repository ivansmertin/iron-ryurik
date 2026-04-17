import type { Prisma } from "@prisma/client";
import { subHours } from "date-fns";
import { prisma } from "@/lib/prisma";
import { withPrismaReadRetry } from "@/lib/prisma-read";

type SessionMutationClient = Pick<
  Prisma.TransactionClient,
  "session" | "booking" | "membership"
>;

type SessionCancellationRecipient = {
  fullName: string;
  email: string;
};

export type CancelSessionResult = {
  cancelledBookingsCount: number;
  session: {
    id: string;
    title: string | null;
    startsAt: Date;
    durationMinutes: number;
  };
  recipients: SessionCancellationRecipient[];
};

export async function cancelSessionWithDb(
  db: SessionMutationClient,
  sessionId: string,
) {
  const session = await db.session.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      status: true,
      title: true,
      startsAt: true,
      durationMinutes: true,
    },
  });

  if (!session) {
    throw new Error("Занятие не найдено");
  }

  if (session.status === "cancelled") {
    throw new Error("Занятие уже отменено");
  }

  const chargedBookings = await db.booking.count({
    where: {
      sessionId,
      status: {
        in: ["completed", "no_show"],
      },
    },
  });

  if (chargedBookings > 0) {
    throw new Error("Нельзя отменить занятие с уже подтвержденными посещениями или неявками");
  }

  const pendingBookings = await db.booking.findMany({
    where: {
      sessionId,
      status: "pending",
    },
    select: {
      id: true,
      user: {
        select: {
          fullName: true,
          email: true,
        },
      },
    },
  });

  const cancelledAt = new Date();

  await db.session.update({
    where: { id: sessionId },
    data: {
      status: "cancelled",
    },
  });

  const cancelledBookings = pendingBookings.length
    ? await db.booking.updateMany({
        where: {
          sessionId,
          status: "pending",
        },
        data: {
          status: "cancelled",
          cancelledAt,
          cancelReason: "session_cancelled",
        },
      })
    : { count: 0 };

  return {
    cancelledBookingsCount: cancelledBookings.count,
    session: {
      id: session.id,
      title: session.title,
      startsAt: session.startsAt,
      durationMinutes: session.durationMinutes,
    },
    recipients: pendingBookings.map((booking) => booking.user),
  };
}

export async function markPastSessionsCompleted(
  db = prisma,
  now = new Date(),
) {
  return withPrismaReadRetry(
    () =>
      db.session.updateMany({
        where: {
          status: "scheduled",
          startsAt: {
            lt: subHours(now, 6),
          },
        },
        data: {
          status: "completed",
        },
      }),
    2,
    "sessions.markPastSessionsCompleted",
  );
}
