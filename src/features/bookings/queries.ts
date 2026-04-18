import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withPrismaReadRetry } from "@/lib/prisma-read";
import { getMoscowWeekRange } from "@/lib/datetime";
import {
  isPrismaSchemaMismatchError,
  logPrismaSchemaWarningOnce,
} from "@/lib/prisma-errors";
import { activeBookingStatuses } from "./service";

export const clientSchedulePeriods = ["this-week", "next-week", "later"] as const;

export type ClientSchedulePeriod = (typeof clientSchedulePeriods)[number];

export type ClientMembershipSnapshot = {
  activeMembership:
    | {
        id: string;
        visitsRemaining: number;
        visitsTotal: number;
        reservedSessions: number;
        availableSessions: number;
        endsAt: Date;
        plan: {
          name: string;
        };
      }
    | null;
  bookableMembership:
    | {
        id: string;
        visitsRemaining: number;
        visitsTotal: number;
        reservedSessions: number;
        availableSessions: number;
        endsAt: Date;
        plan: {
          name: string;
        };
      }
    | null;
};

export type ClientUpcomingBooking = {
  id: string;
  sessionId: string;
  session: {
    title: string | null;
    startsAt: Date;
    durationMinutes: number;
    cancellationDeadlineHours: number;
  };
};

export type ClientScheduleSession = {
  id: string;
  origin: "manual" | "auto_free";
  title: string | null;
  description: string | null;
  startsAt: Date;
  durationMinutes: number;
  capacity: number;
  dropInEnabled: boolean;
  dropInPrice: Prisma.Decimal | null;
  bookings: Array<{
    userId: string;
  }>;
};

export type ClientBookingRecord = {
  id: string;
  status: "pending" | "cancelled" | "completed" | "no_show";
  bookedAt: Date;
  cancelledAt: Date | null;
  cancelReason: string | null;
  session: {
    title: string | null;
    startsAt: Date;
    durationMinutes: number;
    cancellationDeadlineHours: number;
  };
};

function addMembershipAvailability<
  T extends {
    visitsRemaining: number;
    _count: {
      bookings: number;
    };
  },
>(membership: T) {
  const { _count, ...rest } = membership;
  const reservedSessions = _count.bookings;
  const availableSessions = Math.max(
    membership.visitsRemaining - reservedSessions,
    0,
  );

  return {
    ...rest,
    reservedSessions,
    availableSessions,
  };
}

export function getScheduleRange(period: ClientSchedulePeriod, now: Date) {
  const currentWeekRange = getMoscowWeekRange(0, now);
  const nextWeekRange = getMoscowWeekRange(1, now);

  switch (period) {
    case "next-week":
      return nextWeekRange;
    case "later":
      return {
        start: nextWeekRange.end,
      } as const;
    case "this-week":
    default:
      return {
        start: now,
        end: currentWeekRange.end,
      } as const;
  }
}

function getClientScheduleSessionsWhere(start: Date, end?: Date) {
  return {
    type: "group" as const,
    status: "scheduled" as const,
    startsAt: end
      ? {
          gte: start,
          lt: end,
        }
      : {
          gte: start,
        },
  };
}

async function listClientScheduleSessionsWithSchemaFallback(
  start: Date,
  end?: Date,
) {
  const where = getClientScheduleSessionsWhere(start, end);
  const orderBy = { startsAt: "asc" as const };
  const bookingsSelect = {
    where: {
      status: {
        in: [...activeBookingStatuses],
      },
    },
    select: {
      userId: true,
    },
  };

  const normalizeSession = <T extends ClientScheduleSession>(session: T) => ({
    ...session,
    // Legacy auto_free rows can still have dropInEnabled=false.
    // For client UX and booking flow compatibility we always expose them as
    // drop-in eligible.
    dropInEnabled:
      session.origin === "auto_free" ? true : session.dropInEnabled,
  });

  try {
    const sessions = await prisma.session.findMany({
      where,
      orderBy,
      select: {
        id: true,
        origin: true,
        title: true,
        description: true,
        startsAt: true,
        durationMinutes: true,
        capacity: true,
        dropInEnabled: true,
        dropInPrice: true,
        bookings: bookingsSelect,
      },
    });

    return sessions.map(normalizeSession);
  } catch (error) {
    if (
      !isPrismaSchemaMismatchError(error, {
        modelName: "Session",
        columnFragment: ["dropInEnabled", "dropInPrice"],
      })
    ) {
      throw error;
    }

    logPrismaSchemaWarningOnce(
      "bookings.getClientScheduleData",
      "Session.dropInColumns-missing",
      error,
    );

    const legacySessions = await prisma.session.findMany({
      where,
      orderBy,
      select: {
        id: true,
        origin: true,
        title: true,
        description: true,
        startsAt: true,
        durationMinutes: true,
        capacity: true,
        bookings: bookingsSelect,
      },
    });

    return legacySessions.map((session) => ({
      ...session,
      dropInEnabled: session.origin === "auto_free",
      dropInPrice: null,
    }));
  }
}

export async function getClientMembershipSnapshot(
  userId: string,
  now = new Date(),
) {
  const activeMembershipRecord = await prisma.membership.findFirst({
    where: {
      userId,
      status: "active",
      startsAt: {
        lte: now,
      },
      endsAt: {
        gte: now,
      },
    },
    orderBy: {
      endsAt: "desc",
    },
    select: {
      id: true,
      visitsRemaining: true,
      visitsTotal: true,
      endsAt: true,
      plan: {
        select: {
          name: true,
        },
      },
      _count: {
        select: {
          bookings: {
            where: {
              status: "pending",
            },
          },
        },
      },
    },
  });

  const activeMembership = activeMembershipRecord
    ? addMembershipAvailability(activeMembershipRecord)
    : null;

  return {
    activeMembership,
    bookableMembership:
      activeMembership && activeMembership.availableSessions > 0
        ? activeMembership
        : null,
  } satisfies ClientMembershipSnapshot;
}

export async function getClientDashboardData(
  userId: string,
  now = new Date(),
) {
  return withPrismaReadRetry(
    async () => {
      const [membershipSnapshot, nextBooking] = await Promise.all([
        getClientMembershipSnapshot(userId, now),
        prisma.booking.findFirst({
          where: {
            userId,
            status: "pending",
            session: {
              type: "group",
              status: "scheduled",
              startsAt: {
                gte: now,
              },
            },
          },
          orderBy: {
            session: {
              startsAt: "asc",
            },
          },
          select: {
            id: true,
            sessionId: true,
            session: {
              select: {
          title: true,
          startsAt: true,
          durationMinutes: true,
          cancellationDeadlineHours: true,
        },
      },
          },
        }),
      ]);

      return {
        activeMembership: membershipSnapshot.activeMembership,
        nextBooking,
        bookableMembership: membershipSnapshot.bookableMembership,
      };
    },
    1,
    "bookings.getClientDashboardData",
  );
}


export async function getClientScheduleData(
  userId: string,
  period: ClientSchedulePeriod,
  now = new Date(),
) {
  return withPrismaReadRetry(
    async () => {
      const { start, end } = getScheduleRange(period, now);

      const memberships = await prisma.membership.findMany({
        where: {
          userId,
          status: "active",
          startsAt: {
            lte: now,
          },
          endsAt: {
            gte: now,
          },
        },
        orderBy: {
          endsAt: "asc",
        },
        select: {
          id: true,
          visitsRemaining: true,
          _count: {
            select: {
              bookings: {
                where: {
                  status: "pending",
                },
              },
            },
          },
        },
      });

      const bookableMembership =
        memberships.map(addMembershipAvailability).find((membership) =>
          membership.availableSessions > 0
        ) ?? null;

      const sessions = await listClientScheduleSessionsWithSchemaFallback(
        start,
        end,
      );

      return {
        sessions,
        bookableMembership,
      };
    },
    1,
    "bookings.getClientScheduleData",
  );
}

export async function getClientBookings(userId: string) {
  return withPrismaReadRetry(async () => {
    const bookings = await prisma.booking.findMany({
      where: {
        userId,
        session: {
          type: "group",
        },
      },
      orderBy: {
        bookedAt: "desc",
      },
      select: {
        id: true,
        status: true,
        bookedAt: true,
        cancelledAt: true,
        cancelReason: true,
        session: {
          select: {
            title: true,
            startsAt: true,
            durationMinutes: true,
            cancellationDeadlineHours: true,
          },
        },
      },
    });

    return bookings as ClientBookingRecord[];
  });
}
