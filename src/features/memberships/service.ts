import { Prisma } from "@prisma/client";
import {
  addDaysToMoscowDate,
  createUtcDateFromMoscowDate,
} from "@/lib/datetime";

export const DUPLICATE_ACTIVE_MEMBERSHIP_INDEX = "Membership_userId_active_key";
export const DUPLICATE_ACTIVE_MEMBERSHIP_MESSAGE =
  "У клиента уже есть активный абонемент";

function isDuplicateActiveMembershipError(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (error.code !== "P2002") {
    return false;
  }

  const target = error.meta?.target;

  if (typeof target === "string") {
    return target === DUPLICATE_ACTIVE_MEMBERSHIP_INDEX;
  }

  if (Array.isArray(target)) {
    return target.includes(DUPLICATE_ACTIVE_MEMBERSHIP_INDEX);
  }

  return false;
}

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

  try {
    return await db.membership.create({
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
  } catch (error) {
    if (isDuplicateActiveMembershipError(error)) {
      throw new Error(DUPLICATE_ACTIVE_MEMBERSHIP_MESSAGE);
    }

    throw error;
  }
}
