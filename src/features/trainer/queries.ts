import type { Prisma } from "@prisma/client";
import { getDaysFromNowRange, getMoscowDayRange } from "@/lib/datetime";
import { prisma } from "@/lib/prisma";
import { withPrismaReadRetry } from "@/lib/prisma-read";
import { type ClientSchedulePeriod, getScheduleRange } from "@/features/bookings/queries";
import { activeBookingStatuses } from "@/features/bookings/service";

export const trainerSlotTabs = ["upcoming", "past", "cancelled"] as const;

export type TrainerSlotTab = (typeof trainerSlotTabs)[number];

export type ListTrainerSlotsInput = {
  trainerId: string;
  page: number;
  pageSize: number;
  tab: TrainerSlotTab;
};

export type TrainerSlotListItem = {
  id: string;
  title: string | null;
  description: string | null;
  startsAt: Date;
  durationMinutes: number;
  status: Prisma.SessionGetPayload<{ select: { status: true } }>["status"];
};

export type TrainerDashboardStats = {
  todaySlotsCount: number;
  weekSlotsCount: number;
  clientsCount: number;
  programsCount: number;
  nextSlot: {
    id: string;
    title: string | null;
    startsAt: Date;
    durationMinutes: number;
    status: Prisma.SessionGetPayload<{ select: { status: true } }>["status"];
  } | null;
};

export type TrainerClientListItem = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  sport: Prisma.UserGetPayload<{ select: { sport: true } }>["sport"];
  createdAt: Date;
  programs: Array<{
    id: string;
    name: string;
    startsAt: Date;
    endsAt: Date | null;
  }>;
};

export type TrainerClientDetails = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  sport: Prisma.UserGetPayload<{ select: { sport: true } }>["sport"];
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  programs: Array<{
    id: string;
    name: string;
    startsAt: Date;
    endsAt: Date | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    template: {
      name: string;
    } | null;
  }>;
};

function getTrainerSlotWhereClause(
  trainerId: string,
  tab: TrainerSlotTab,
  now: Date,
): Prisma.SessionWhereInput {
  switch (tab) {
    case "past":
      return {
        trainerId,
        status: {
          not: "cancelled",
        },
        startsAt: {
          lt: now,
        },
      };
    case "cancelled":
      return {
        trainerId,
        status: "cancelled",
      };
    case "upcoming":
    default:
      return {
        trainerId,
        status: "scheduled",
        startsAt: {
          gte: now,
        },
      };
  }
}

function getTrainerClientsWhereClause(trainerId: string, query: string): Prisma.UserWhereInput {
  const trimmedQuery = query.trim();

  const where: Prisma.UserWhereInput = {
    role: "client",
    deletedAt: null,
    programs: {
      some: {
        trainerId,
      },
    },
  };

  if (!trimmedQuery) {
    return where;
  }

  return {
    ...where,
    OR: [
      {
        fullName: {
          contains: trimmedQuery,
          mode: "insensitive",
        },
      },
      {
        email: {
          contains: trimmedQuery,
          mode: "insensitive",
        },
      },
    ],
  };
}

export async function getTrainerDashboardStats(
  trainerId: string,
  now = new Date(),
) {
  const todayRange = getMoscowDayRange(now);
  const weekRange = getDaysFromNowRange(7, now);

  return withPrismaReadRetry(
    async () => {
      const [
        todaySlotsCount,
        weekSlotsCount,
        clientsCount,
        programsCount,
        nextSlot,
      ] = await Promise.all([
        prisma.session.count({
          where: {
            trainerId,
            status: "scheduled",
            startsAt: {
              gte: todayRange.start,
              lt: todayRange.end,
            },
          },
        }),
        prisma.session.count({
          where: {
            trainerId,
            status: "scheduled",
            startsAt: {
              gte: now,
              lt: weekRange.end,
            },
          },
        }),
        prisma.user.count({
          where: {
            role: "client",
            deletedAt: null,
            programs: {
              some: {
                trainerId,
              },
            },
          },
        }),
        prisma.program.count({
          where: {
            trainerId,
          },
        }),
        prisma.session.findFirst({
          where: {
            trainerId,
            status: "scheduled",
            startsAt: {
              gte: now,
            },
          },
          orderBy: {
            startsAt: "asc",
          },
          select: {
            id: true,
            title: true,
            startsAt: true,
            durationMinutes: true,
            status: true,
          },
        }),
      ]);

      return {
        todaySlotsCount,
        weekSlotsCount,
        clientsCount,
        programsCount,
        nextSlot,
      } satisfies TrainerDashboardStats;
    },
    1,
    "trainer.getTrainerDashboardStats",
  );
}

export async function listTrainerSlots({
  trainerId,
  page,
  pageSize,
  tab,
}: ListTrainerSlotsInput) {
  const now = new Date();
  const where = getTrainerSlotWhereClause(trainerId, tab, now);
  const orderBy: Prisma.SessionOrderByWithRelationInput = {
    startsAt: tab === "upcoming" ? "asc" : "desc",
  };

  const result = await withPrismaReadRetry(
    async () => {
      const total = await prisma.session.count({ where });
      const items = await prisma.session.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          title: true,
          description: true,
          startsAt: true,
          durationMinutes: true,
          status: true,
        },
      });

      return {
        total,
        items,
      };
    },
    1,
    "trainer.listTrainerSlots",
  );

  return {
    total: result.total,
    totalPages: Math.max(1, Math.ceil(result.total / pageSize)),
    items: result.items as TrainerSlotListItem[],
  };
}

export async function getTrainerSlotById(trainerId: string, slotId: string) {
  return withPrismaReadRetry(
    () =>
      prisma.session.findFirst({
        where: {
          id: slotId,
          trainerId,
        },
        select: {
          id: true,
          title: true,
          description: true,
          startsAt: true,
          durationMinutes: true,
          status: true,
          version: true,
        },
      }),
    1,
    "trainer.getTrainerSlotById",
  );
}

export async function listTrainerClients({
  trainerId,
  page,
  pageSize,
  query,
}: {
  trainerId: string;
  page: number;
  pageSize: number;
  query: string;
}) {
  const where = getTrainerClientsWhereClause(trainerId, query);

  const result = await withPrismaReadRetry(
    async () => {
      const [total, items] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
          orderBy: {
            createdAt: "desc",
          },
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            sport: true,
            createdAt: true,
            programs: {
              where: {
                trainerId,
              },
              orderBy: {
                startsAt: "desc",
              },
              take: 1,
              select: {
                id: true,
                name: true,
                startsAt: true,
                endsAt: true,
              },
            },
          },
        }),
      ]);

      return {
        total,
        items,
      };
    },
    1,
    "trainer.listTrainerClients",
  );

  return {
    total: result.total,
    totalPages: Math.max(1, Math.ceil(result.total / pageSize)),
    items: result.items as TrainerClientListItem[],
  };
}

export async function getTrainerClientById(
  trainerId: string,
  clientId: string,
) {
  return withPrismaReadRetry(
    () =>
      prisma.user.findFirst({
        where: {
          id: clientId,
          role: "client",
          deletedAt: null,
          programs: {
            some: {
              trainerId,
            },
          },
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          sport: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
          programs: {
            where: {
              trainerId,
            },
            orderBy: [
              {
                startsAt: "desc",
              },
              {
                createdAt: "desc",
              },
            ],
            take: 50,
            select: {
              id: true,
              name: true,
              startsAt: true,
              endsAt: true,
              notes: true,
              createdAt: true,
              updatedAt: true,
              template: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
    1,
    "trainer.getTrainerClientById",
  );
}

export async function getTrainerScheduleData(
  period: ClientSchedulePeriod,
  now = new Date(),
) {
  return withPrismaReadRetry(
    async () => {
      const { start, end } = getScheduleRange(period, now);

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
          origin: true,
          trainerId: true,
          trainer: {
            select: {
              fullName: true,
            },
          },
          bookings: {
            where: {
              status: {
                in: [...activeBookingStatuses],
              },
            },
            select: {
              id: true,
            },
          },
        },
      });

      return { sessions };
    },
    1,
    "trainer.getTrainerScheduleData",
  );
}
