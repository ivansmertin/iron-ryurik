import type {
  BookingStatus,
  MembershipStatus,
  Prisma,
  Sport,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withPrismaReadRetry } from "@/lib/prisma-read";

type ListClientsInput = {
  page: number;
  pageSize: number;
  query: string;
};

export type ClientMembership = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  visitsRemaining: number;
  visitsTotal: number;
  status: MembershipStatus;
  paidAt: Date | null;
  paidAmount: Prisma.Decimal | null;
  plan: {
    name: string;
  };
};

export type ClientProfile = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  sport: Sport | null;
  notes: string | null;
  createdAt: Date;
};

export type ClientBookingHistoryItem = {
  id: string;
  status: BookingStatus;
  session: {
    title: string | null;
    startsAt: Date;
  };
};

function getClientsWhereClause(query: string): Prisma.UserWhereInput {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return {
      role: "client",
      deletedAt: null,
    };
  }

  return {
    role: "client",
    deletedAt: null,
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

export async function listClients({
  page,
  pageSize,
  query,
}: ListClientsInput) {
  const where = getClientsWhereClause(query);
  const now = new Date();

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
            sport: true,
            createdAt: true,
            memberships: {
              where: {
                status: "active",
                endsAt: {
                  gte: now,
                },
              },
              orderBy: {
                endsAt: "desc",
              },
              take: 1,
              select: {
                id: true,
                plan: {
                  select: {
                    name: true,
                  },
                },
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
    "clients.listClients",
  );

  return {
    total: result.total,
    totalPages: Math.max(1, Math.ceil(result.total / pageSize)),
    items: result.items,
  };
}

export async function getClientProfile(
  clientId: string,
): Promise<ClientProfile | null> {
  return withPrismaReadRetry(
    () =>
      prisma.user.findFirst({
        where: {
          id: clientId,
          role: "client",
          deletedAt: null,
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          sport: true,
          notes: true,
          createdAt: true,
        },
      }),
    1,
    "clients.getClientProfile",
  );
}

export async function getClientMemberships(
  clientId: string,
): Promise<ClientMembership[]> {
  return withPrismaReadRetry(
    () =>
      prisma.membership.findMany({
        where: {
          userId: clientId,
        },
        orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          startsAt: true,
          endsAt: true,
          visitsRemaining: true,
          visitsTotal: true,
          status: true,
          paidAt: true,
          paidAmount: true,
          plan: {
            select: {
              name: true,
            },
          },
        },
      }),
    1,
    "clients.getClientMemberships",
  );
}

export async function getClientBookingHistory(
  clientId: string,
): Promise<ClientBookingHistoryItem[]> {
  return withPrismaReadRetry(
    () =>
      prisma.booking.findMany({
        where: {
          userId: clientId,
        },
        take: 50,
        orderBy: {
          bookedAt: "desc",
        },
        select: {
          id: true,
          status: true,
          session: {
            select: {
              title: true,
              startsAt: true,
            },
          },
        },
      }),
    1,
    "clients.getClientBookingHistory",
  );
}
