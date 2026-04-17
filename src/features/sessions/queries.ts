import type { Prisma } from "@prisma/client";
import { activeBookingStatuses } from "@/features/bookings/service";
import { prisma } from "@/lib/prisma";
import { withPrismaReadRetry } from "@/lib/prisma-read";

export const sessionListTabs = ["upcoming", "past", "cancelled"] as const;

export type SessionListTab = (typeof sessionListTabs)[number];

export type ListSessionsInput = {
  page: number;
  pageSize: number;
  tab: SessionListTab;
};

function getSessionWhereClause(tab: SessionListTab): Prisma.SessionWhereInput {
  const now = new Date();

  switch (tab) {
    case "past":
      return {
        type: "group",
        status: {
          not: "cancelled",
        },
        startsAt: {
          lt: now,
        },
      };
    case "cancelled":
      return {
        type: "group",
        status: "cancelled",
      };
    case "upcoming":
    default:
      return {
        type: "group",
        status: "scheduled",
        startsAt: {
          gte: now,
        },
      };
  }
}

export async function listSessions({
  page,
  pageSize,
  tab,
}: ListSessionsInput) {
  const where = getSessionWhereClause(tab);
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
          origin: true,
          autoSlotKey: true,
          startsAt: true,
          durationMinutes: true,
          capacity: true,
          cancellationDeadlineHours: true,
          status: true,
          trainer: {
            select: {
              id: true,
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

      return {
        total,
        items,
      };
    },
    1,
    "sessions.listSessions",
  );

  return {
    total: result.total,
    totalPages: Math.max(1, Math.ceil(result.total / pageSize)),
    items: result.items,
  };
}

export async function getSessionById(id: string) {
  return withPrismaReadRetry(
    () =>
      prisma.session.findFirst({
        where: {
          id,
          type: "group",
        },
        select: {
          id: true,
          title: true,
          description: true,
          trainerId: true,
          origin: true,
          autoSlotKey: true,
          startsAt: true,
          durationMinutes: true,
          capacity: true,
          cancellationDeadlineHours: true,
          status: true,
          version: true,
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
      }),
    1,
    "sessions.getSessionById",
  );
}

export async function listSessionTrainers() {
  return withPrismaReadRetry(
    () =>
      prisma.user.findMany({
        where: {
          role: {
            in: ["trainer", "admin"],
          },
          deletedAt: null,
        },
        orderBy: {
          fullName: "asc",
        },
        select: {
          id: true,
          fullName: true,
        },
      }),
    1,
    "sessions.listSessionTrainers",
  );
}
