import { prisma } from "@/lib/prisma";
import { withPrismaReadRetry } from "@/lib/prisma-read";
import { getMoscowWeekRange } from "@/lib/datetime";

export const clientSchedulePeriods = ["this-week", "next-week", "later"] as const;

export type ClientSchedulePeriod = (typeof clientSchedulePeriods)[number];

export type ClientMembershipSnapshot = {
  activeMembership:
    | {
        id: string;
        visitsRemaining: number;
        visitsTotal: number;
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
  };
};

export type ClientScheduleSession = {
  id: string;
  title: string | null;
  description: string | null;
  startsAt: Date;
  durationMinutes: number;
  capacity: number;
  bookings: Array<{
    userId: string;
  }>;
};

export type ClientBookingRecord = {
  id: string;
  status: "booked" | "cancelled" | "attended" | "no_show";
  bookedAt: Date;
  cancelledAt: Date | null;
  cancelReason: string | null;
  session: {
    title: string | null;
    startsAt: Date;
    durationMinutes: number;
  };
};

function getScheduleRange(period: ClientSchedulePeriod, now: Date) {
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

export async function getClientMembershipSnapshot(
  userId: string,
  now = new Date(),
) {
  const activeMembership = await prisma.membership.findFirst({
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
    },
  });

  return {
    activeMembership,
    bookableMembership:
      activeMembership && activeMembership.visitsRemaining > 0
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
            status: "booked",
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

      const bookableMembership = await prisma.membership.findFirst({
        where: {
          userId,
          status: "active",
          startsAt: {
            lte: now,
          },
          endsAt: {
            gte: now,
          },
          visitsRemaining: {
            gt: 0,
          },
        },
        orderBy: {
          endsAt: "desc",
        },
        select: {
          id: true,
        },
      });

      const sessions = await prisma.session.findMany({
        where: {
          type: "group",
          status: "scheduled",
          startsAt: end
            ? {
                gte: start,
                lt: end,
              }
            : {
                gte: start,
              },
        },
        orderBy: {
          startsAt: "asc",
        },
        select: {
          id: true,
          title: true,
          description: true,
          startsAt: true,
          durationMinutes: true,
          capacity: true,
          bookings: {
            where: {
              status: "booked",
            },
            select: {
              userId: true,
            },
          },
        },
      });

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
          },
        },
      },
    });

    return bookings as ClientBookingRecord[];
  });
}
