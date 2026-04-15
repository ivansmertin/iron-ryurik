import type { Prisma } from "@prisma/client";
import {
  addDaysToMoscowDate,
  createUtcDateFromMoscowDate,
} from "@/lib/datetime";

type MembershipMutationClient = Pick<
  Prisma.TransactionClient,
  "membership" | "membershipPlan"
>;

type IssueMembershipInput = {
  planId: string;
  startsAt: string;
  isPaid: boolean;
  paidAmount?: number | "";
  paidAt?: string;
};

export async function issueMembershipWithDb(
  db: MembershipMutationClient,
  clientId: string,
  input: IssueMembershipInput,
) {
  const plan = await db.membershipPlan.findFirst({
    where: {
      id: input.planId,
      isActive: true,
    },
    select: {
      id: true,
      visits: true,
      durationDays: true,
      price: true,
    },
  });

  if (!plan) {
    throw new Error("Активный план не найден");
  }

  const startsAt = createUtcDateFromMoscowDate(input.startsAt);
  const endsAt = addDaysToMoscowDate(input.startsAt, plan.durationDays);

  if (!startsAt || !endsAt) {
    throw new Error("Не удалось обработать дату абонемента");
  }

  const paidAt =
    input.isPaid && input.paidAt
      ? createUtcDateFromMoscowDate(input.paidAt)
      : null;

  return db.membership.create({
    data: {
      userId: clientId,
      planId: plan.id,
      visitsRemaining: plan.visits,
      visitsTotal: plan.visits,
      startsAt,
      endsAt,
      status: "active",
      paidAt,
      paidAmount:
        input.isPaid && input.paidAmount !== "" && input.paidAmount !== undefined
          ? input.paidAmount.toFixed(2)
          : null,
    },
  });
}
