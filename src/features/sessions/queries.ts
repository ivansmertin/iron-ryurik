import type { Prisma } from "@prisma/client";
import { activeBookingStatuses } from "@/features/bookings/service";
import { prisma } from "@/lib/prisma";
import { withPrismaReadRetry } from "@/lib/prisma-read";
import {
  isPrismaSchemaMismatchError,
  logPrismaSchemaWarningOnce,
} from "@/lib/prisma-errors";

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

const listSessionsLegacySelect = {
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
} satisfies Prisma.SessionSelect;

const listSessionsSelect = {
  ...listSessionsLegacySelect,
  dropInEnabled: true,
  dropInPrice: true,
} satisfies Prisma.SessionSelect;

const sessionByIdLegacySelect = {
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
} satisfies Prisma.SessionSelect;

const sessionByIdSelect = {
  ...sessionByIdLegacySelect,
  dropInEnabled: true,
  dropInPrice: true,
} satisfies Prisma.SessionSelect;

function isSessionDropInColumnsSchemaMismatch(error: unknown) {
  return isPrismaSchemaMismatchError(error, {
    modelName: "Session",
    columnFragment: ["dropInEnabled", "dropInPrice"],
  });
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
      let items;

      try {
        items = await prisma.session.findMany({
          where,
          orderBy,
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: listSessionsSelect,
        });
      } catch (error) {
        if (!isSessionDropInColumnsSchemaMismatch(error)) {
          throw error;
        }

        logPrismaSchemaWarningOnce(
          "sessions.listSessions",
          "Session.dropInColumns-missing",
          error,
        );

        const legacyItems = await prisma.session.findMany({
          where,
          orderBy,
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: listSessionsLegacySelect,
        });

        items = legacyItems.map((session) => ({
          ...session,
          dropInEnabled: false,
          dropInPrice: null,
        }));
      }

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
    async () => {
      const where = {
        id,
        type: "group" as const,
      };

      try {
        return await prisma.session.findFirst({
          where,
          select: sessionByIdSelect,
        });
      } catch (error) {
        if (!isSessionDropInColumnsSchemaMismatch(error)) {
          throw error;
        }

        logPrismaSchemaWarningOnce(
          "sessions.getSessionById",
          "Session.dropInColumns-missing",
          error,
        );

        const session = await prisma.session.findFirst({
          where,
          select: sessionByIdLegacySelect,
        });

        if (!session) {
          return null;
        }

        return {
          ...session,
          dropInEnabled: false,
          dropInPrice: null,
        };
      }
    },
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
