import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withPrismaReadRetry } from "@/lib/prisma-read";

type ActiveMembershipPlan = {
  id: string;
  name: string;
  visits: number;
  durationDays: number;
  price: Prisma.Decimal;
};

export async function listMembershipPlans() {
  return withPrismaReadRetry(() =>
    prisma.membershipPlan.findMany({
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
      name: true,
      visits: true,
      durationDays: true,
      price: true,
      isActive: true,
      _count: {
        select: {
          memberships: true,
        },
        },
      },
    }),
  );
}

export async function getMembershipPlanById(id: string) {
  return withPrismaReadRetry(() =>
    prisma.membershipPlan.findUnique({
      where: { id },
      select: {
        id: true,
      name: true,
      visits: true,
      durationDays: true,
      price: true,
      isActive: true,
      _count: {
        select: {
          memberships: true,
        },
        },
      },
    }),
  );
}

export async function getActiveMembershipPlans(): Promise<ActiveMembershipPlan[]> {
  return withPrismaReadRetry(() =>
    prisma.membershipPlan.findMany({
      where: {
        isActive: true,
    },
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      visits: true,
      durationDays: true,
        price: true,
      },
    }),
  );
}
