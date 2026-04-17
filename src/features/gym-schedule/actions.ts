"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/features/auth/get-user";
import {
  type ActionState,
  getActionError,
  getActionFieldErrorsFromZodError,
} from "@/lib/action-state";
import { prisma } from "@/lib/prisma";
import {
  getDatabaseActionErrorMessage,
  logPrismaError,
} from "@/lib/prisma-errors";
import { gymScheduleSettingsSchema } from "./schemas";
import { saveGymScheduleSettingsWithDb } from "./service";

function timeToMinutes(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);

  if (!match) {
    return Number.NaN;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function getScheduleSettingsPayload(formData: FormData) {
  return {
    freeSlotCapacity: String(formData.get("freeSlotCapacity") ?? ""),
    freeSlotDurationMinutes: 60 as const,
    freeSlotDropInPrice: String(formData.get("freeSlotDropInPrice") ?? "0"),
    workingHours: Array.from({ length: 7 }, (_, index) => {
      const weekday = index + 1;

      return {
        weekday,
        isOpen: formData.get(`weekday-${weekday}-open`) === "on",
        opensAtMinutes: timeToMinutes(
          String(formData.get(`weekday-${weekday}-opensAt`) ?? ""),
        ),
        closesAtMinutes: timeToMinutes(
          String(formData.get(`weekday-${weekday}-closesAt`) ?? ""),
        ),
      };
    }),
  };
}

export async function saveGymScheduleSettings(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser("admin");

  const parsed = gymScheduleSettingsSchema.safeParse(
    getScheduleSettingsPayload(formData),
  );

  if (!parsed.success) {
    return getActionFieldErrorsFromZodError(parsed.error);
  }

  const startedAt = Date.now();

  try {
    await prisma.$transaction(
      (tx) => saveGymScheduleSettingsWithDb(tx, parsed.data),
      {
        timeout: 15000,
      },
    );
  } catch (error) {
    logPrismaError("gymSchedule.saveGymScheduleSettings", error, startedAt);

    return getActionError(
      getDatabaseActionErrorMessage(
        error,
        "Не удалось сохранить настройки расписания.",
      ),
    );
  }

  revalidatePath("/admin");
  revalidatePath("/admin/schedule");
  revalidatePath("/admin/schedule/settings");
  revalidatePath("/client/schedule");
  revalidatePath("/trainer/slots");

  redirect("/admin/schedule/settings?toast=schedule-settings-updated");
}
