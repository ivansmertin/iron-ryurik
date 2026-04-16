"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/features/auth/get-user";
import {
  ActionState,
  getActionError,
  getActionFieldErrorsFromZodError,
} from "@/lib/action-state";
import { prisma } from "@/lib/prisma";
import {
  getDatabaseActionErrorMessage,
  logPrismaError,
} from "@/lib/prisma-errors";
import { issueMembershipWithDb } from "./service";
import { issueMembershipSchema, membershipPlanSchema } from "./schemas";

function buildMembershipPlansRedirect(toast: string) {
  return `/admin/memberships/plans?toast=${encodeURIComponent(toast)}`;
}

function buildClientRedirect(clientId: string, toast: string) {
  return `/admin/clients/${clientId}?toast=${encodeURIComponent(toast)}`;
}

function getPlanPayload(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    visits: String(formData.get("visits") ?? ""),
    durationDays: String(formData.get("durationDays") ?? ""),
    price: String(formData.get("price") ?? ""),
    isActive: formData.get("isActive") === "on",
  };
}

export async function createMembershipPlan(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser("admin");

  const parsed = membershipPlanSchema.safeParse(getPlanPayload(formData));

  if (!parsed.success) {
    return getActionFieldErrorsFromZodError(parsed.error);
  }

  const startedAt = Date.now();

  try {
    await prisma.membershipPlan.create({
      data: {
        name: parsed.data.name,
        visits: parsed.data.visits,
        durationDays: parsed.data.durationDays,
        price: parsed.data.price.toFixed(2),
        isActive: parsed.data.isActive,
      },
    });
  } catch (error) {
    logPrismaError("memberships.createMembershipPlan", error, startedAt);

    return getActionError(
      getDatabaseActionErrorMessage(
        error,
        "Не удалось создать план. Попробуйте ещё раз.",
      ),
    );
  }

  redirect(buildMembershipPlansRedirect("plan-created"));
}

export async function updateMembershipPlan(
  planId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser("admin");

  const startedAt = Date.now();

  try {
    const existingPlan = await prisma.membershipPlan.findUnique({
      where: {
        id: planId,
      },
      select: {
        id: true,
      },
    });

    if (!existingPlan) {
      return getActionError("План не найден.");
    }

    const parsed = membershipPlanSchema.safeParse(getPlanPayload(formData));

    if (!parsed.success) {
      return getActionFieldErrorsFromZodError(parsed.error);
    }

    await prisma.membershipPlan.update({
      where: {
        id: planId,
      },
      data: {
        name: parsed.data.name,
        visits: parsed.data.visits,
        durationDays: parsed.data.durationDays,
        price: parsed.data.price.toFixed(2),
        isActive: parsed.data.isActive,
      },
    });
  } catch (error) {
    logPrismaError("memberships.updateMembershipPlan", error, startedAt);

    return getActionError(
      getDatabaseActionErrorMessage(
        error,
        "Не удалось сохранить изменения плана. Попробуйте ещё раз.",
        {
          preserveKnownErrorMessage: true,
        },
      ),
    );
  }

  redirect(buildMembershipPlansRedirect("plan-updated"));
}

export async function deleteMembershipPlan(
  planId: string,
  prevState?: ActionState,
): Promise<ActionState> {
  void prevState;
  await requireUser("admin");

  const startedAt = Date.now();

  try {
    const existingPlan = await prisma.membershipPlan.findUnique({
      where: { id: planId },
      select: {
        id: true,
        _count: {
          select: {
            memberships: true,
          },
        },
      },
    });

    if (!existingPlan) {
      return getActionError("План не найден.");
    }

    if (existingPlan._count.memberships > 0) {
      return getActionError("Нельзя удалить план, который уже выдан клиентам.");
    }

    await prisma.membershipPlan.delete({
      where: { id: planId },
    });
  } catch (error) {
    logPrismaError("memberships.deleteMembershipPlan", error, startedAt);

    return getActionError(
      getDatabaseActionErrorMessage(
        error,
        "Не удалось удалить план. Попробуйте ещё раз.",
        {
          preserveKnownErrorMessage: true,
        },
      ),
    );
  }

  redirect(buildMembershipPlansRedirect("plan-deleted"));
}

export async function issueMembership(
  clientId: string,
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  void prevState;
  await requireUser("admin");

  const startedAt = Date.now();

  try {
    const client = await prisma.user.findFirst({
      where: {
        id: clientId,
        role: "client",
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!client) {
      return getActionError("Клиент не найден.");
    }

    const parsed = issueMembershipSchema.safeParse({
      planId: String(formData.get("planId") ?? ""),
      startsAt: String(formData.get("startsAt") ?? ""),
      isPaid: formData.get("isPaid") === "on",
      paidAmount: String(formData.get("paidAmount") ?? ""),
      paidAt: String(formData.get("paidAt") ?? ""),
    });

    if (!parsed.success) {
      return getActionFieldErrorsFromZodError(parsed.error);
    }

    await prisma.$transaction((tx) =>
      issueMembershipWithDb(tx, clientId, {
        planId: parsed.data.planId,
        startsAt: parsed.data.startsAt,
        isPaid: parsed.data.isPaid,
        paidAmount:
          parsed.data.paidAmount === "" ? undefined : parsed.data.paidAmount,
        paidAt: parsed.data.paidAt || undefined,
      }),
    );
  } catch (error) {
    logPrismaError("memberships.issueMembership", error, startedAt);

    return getActionError(
      getDatabaseActionErrorMessage(
        error,
        "Не удалось выдать абонемент. Попробуйте ещё раз.",
        {
          preserveKnownErrorMessage: true,
        },
      ),
    );
  }

  redirect(buildClientRedirect(clientId, "membership-issued"));
}

export async function purchaseMembershipClient(
  planId: string,
  prevState?: ActionState,
): Promise<ActionState> {
  void prevState;
  const user = await requireUser("client");

  const startedAt = Date.now();

  try {
    const { getMoscowDateInputValue } = await import("@/lib/datetime");
    const moscowDateValue = getMoscowDateInputValue(new Date());

    await prisma.$transaction((tx) =>
      issueMembershipWithDb(tx, user.id, {
        planId,
        startsAt: moscowDateValue,
        isPaid: false,
      }),
    );
  } catch (error) {
    logPrismaError("memberships.purchaseMembershipClient", error, startedAt);

    return getActionError(
      getDatabaseActionErrorMessage(
        error,
        "Не удалось оформить абонемент. Попробуйте ещё раз.",
        {
          preserveKnownErrorMessage: true,
        },
      ),
    );
  }

  redirect("/client?toast=" + encodeURIComponent("membership-purchased"));
}
