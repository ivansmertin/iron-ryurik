import type { Prisma } from "@prisma/client";
import { subHours } from "date-fns";
import { prisma } from "@/lib/prisma";

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

  const bookedBookings = await db.booking.findMany({
    where: {
      sessionId,
      status: "booked",
    },
    select: {
      id: true,
      membershipId: true,
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

  const cancelledBookings = bookedBookings.length
    ? await db.booking.updateMany({
        where: {
          sessionId,
          status: "booked",
        },
        data: {
          status: "cancelled",
          cancelledAt,
        },
      })
    : { count: 0 };

  const membershipIncrements = new Map<string, number>();

  for (const booking of bookedBookings) {
    if (!booking.membershipId) {
      continue;
    }

    membershipIncrements.set(
      booking.membershipId,
      (membershipIncrements.get(booking.membershipId) ?? 0) + 1,
    );
  }

  await Promise.all(
    Array.from(membershipIncrements.entries()).map(([membershipId, count]) =>
      db.membership.update({
        where: { id: membershipId },
        data: {
          visitsRemaining: {
            increment: count,
          },
        },
      }),
    ),
  );

  return {
    cancelledBookingsCount: cancelledBookings.count,
    session: {
      id: session.id,
      title: session.title,
      startsAt: session.startsAt,
      durationMinutes: session.durationMinutes,
    },
    recipients: bookedBookings.map((booking) => booking.user),
  };
}

export async function markPastSessionsCompleted(
  db = prisma,
  now = new Date(),
) {
  return db.session.updateMany({
    where: {
      status: "scheduled",
      startsAt: {
        lt: subHours(now, 6),
      },
    },
    data: {
      status: "completed",
    },
  });
}
