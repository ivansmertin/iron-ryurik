"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/features/auth/get-user";
import {
  ActionState,
  getActionError,
  getActionFieldErrorsFromZodError,
} from "@/lib/action-state";
import { createUtcDateFromMoscowDateTime } from "@/lib/datetime";
import { prisma } from "@/lib/prisma";
import {
  getDatabaseActionErrorMessage,
  logPrismaError,
} from "@/lib/prisma-errors";
import { cancelSessionWithDb } from "@/features/sessions/service";
import { trainerSlotSchema } from "./schemas";

const ACTIVE_BOOKING_STATUSES = ["pending", "completed", "no_show"] as const;

function buildTrainerSlotsRedirect(toast: string) {
  return `/trainer/slots?toast=${encodeURIComponent(toast)}`;
}

function getSlotPayload(formData: FormData) {
  return {
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    date: String(formData.get("date") ?? ""),
    startTime: String(formData.get("startTime") ?? ""),
    durationMinutes: String(formData.get("durationMinutes") ?? ""),
  };
}

function normalizeOptionalText(value: string) {
  const trimmed = value.trim();

  return trimmed ? trimmed : null;
}

export async function createTrainerSlot(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("trainer");
  const parsed = trainerSlotSchema.safeParse(getSlotPayload(formData));

  if (!parsed.success) {
    return getActionFieldErrorsFromZodError(parsed.error);
  }

  const startsAt = createUtcDateFromMoscowDateTime(
    parsed.data.date,
    parsed.data.startTime,
  );

  if (!startsAt) {
    return getActionError("Не удалось прочитать дату и время слота.");
  }

  const startedAt = Date.now();

  try {
    await prisma.$transaction(async (tx) => {
      const existingFreeSlot = await tx.session.findFirst({
        where: {
          type: "group",
          origin: "auto_free",
          status: "scheduled",
          startsAt,
        },
        select: {
          id: true,
          capacity: true,
          durationMinutes: true,
          bookings: {
            where: {
              status: {
                in: [...ACTIVE_BOOKING_STATUSES],
              },
            },
            select: {
              id: true,
            },
          },
        },
      });

      if (existingFreeSlot) {
        const activeBookingsCount = existingFreeSlot.bookings.length;

        await tx.session.update({
          where: {
            id: existingFreeSlot.id,
          },
          data: {
            origin: "manual",
            autoSlotKey: null,
            trainerId: user.id,
            title: normalizeOptionalText(parsed.data.title),
            description: normalizeOptionalText(parsed.data.description),
            durationMinutes: activeBookingsCount
              ? existingFreeSlot.durationMinutes
              : parsed.data.durationMinutes,
            capacity: Math.max(existingFreeSlot.capacity, activeBookingsCount),
            version: {
              increment: 1,
            },
          },
        });
        return;
      }

      await tx.session.create({
        data: {
          type: "personal",
          origin: "manual",
          trainerId: user.id,
          title: normalizeOptionalText(parsed.data.title),
          description: normalizeOptionalText(parsed.data.description),
          startsAt,
          durationMinutes: parsed.data.durationMinutes,
          capacity: 1,
        },
      });
    });
  } catch (error) {
    logPrismaError("trainer.createTrainerSlot", error, startedAt);

    return getActionError(
      getDatabaseActionErrorMessage(
        error,
        "Не удалось создать слот. Попробуйте ещё раз.",
      ),
    );
  }

  revalidatePath("/trainer");
  revalidatePath("/trainer/slots");

  redirect(buildTrainerSlotsRedirect("session-created"));
}

export async function updateTrainerSlot(
  slotId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("trainer");
  const startedAt = Date.now();

  try {
    const existingSlot = await prisma.session.findFirst({
      where: {
        id: slotId,
        trainerId: user.id,
      },
      select: {
        id: true,
        status: true,
        startsAt: true,
      },
    });

    if (!existingSlot) {
      return getActionError("Слот не найден.");
    }

    if (
      existingSlot.status !== "scheduled" ||
      existingSlot.startsAt.getTime() <= new Date().getTime()
    ) {
      return getActionError("Слот больше нельзя редактировать.");
    }

    const parsed = trainerSlotSchema.safeParse(getSlotPayload(formData));

    if (!parsed.success) {
      return getActionFieldErrorsFromZodError(parsed.error);
    }

    const startsAt = createUtcDateFromMoscowDateTime(
      parsed.data.date,
      parsed.data.startTime,
    );

    if (!startsAt) {
      return getActionError("Не удалось прочитать дату и время слота.");
    }

    await prisma.session.update({
      where: {
        id: slotId,
      },
      data: {
        title: normalizeOptionalText(parsed.data.title),
        description: normalizeOptionalText(parsed.data.description),
        startsAt,
        durationMinutes: parsed.data.durationMinutes,
        version: {
          increment: 1,
        },
      },
    });
  } catch (error) {
    logPrismaError("trainer.updateTrainerSlot", error, startedAt);

    return getActionError(
      getDatabaseActionErrorMessage(
        error,
        "Не удалось сохранить изменения слота. Попробуйте ещё раз.",
        {
          preserveKnownErrorMessage: true,
        },
      ),
    );
  }

  revalidatePath("/trainer");
  revalidatePath("/trainer/slots");
  revalidatePath(`/trainer/slots/${slotId}`);

  redirect(buildTrainerSlotsRedirect("session-updated"));
}

export async function cancelTrainerSlot(
  slotId: string,
  prevState?: ActionState,
  formData?: FormData,
): Promise<ActionState> {
  void prevState;
  void formData;

  const user = await requireUser("trainer");
  const startedAt = Date.now();
  let cancelledBookingsCount: number | null = null;

  try {
    const existingSlot = await prisma.session.findFirst({
      where: {
        id: slotId,
        trainerId: user.id,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!existingSlot) {
      return getActionError("Слот не найден.");
    }

    if (existingSlot.status !== "scheduled") {
      return getActionError("Слот больше нельзя отменить.");
    }

    const result = await prisma.$transaction((tx) => cancelSessionWithDb(tx, slotId));
    cancelledBookingsCount = result.cancelledBookingsCount;
  } catch (error) {
    logPrismaError("trainer.cancelTrainerSlot", error, startedAt);

    return getActionError(
      getDatabaseActionErrorMessage(
        error,
        "Не удалось отменить слот.",
        {
          preserveKnownErrorMessage: true,
        },
      ),
    );
  }

  revalidatePath("/trainer");
  revalidatePath("/trainer/slots");
  revalidatePath(`/trainer/slots/${slotId}`);

  redirect(
    buildTrainerSlotsRedirect(`session-cancelled:${cancelledBookingsCount ?? 0}`),
  );
}

export async function updateTrainerClientNotes(
  clientId: string,
  _prevState: UpdateTrainerClientNotesActionState,
  formData: FormData,
): Promise<UpdateTrainerClientNotesActionState> {
  const user = await requireUser("trainer");
  const notes = String(formData.get("notes") ?? "").trim();
  const startedAt = Date.now();
  let client: { id: string } | null = null;

  try {
    client = await prisma.user.findFirst({
      where: {
        id: clientId,
        role: "client",
        deletedAt: null,
        programs: {
          some: {
            trainerId: user.id,
          },
        },
      },
      select: {
        id: true,
      },
    });
  } catch (error) {
    logPrismaError("trainer.updateTrainerClientNotes.findClient", error, startedAt);

    return getActionError(
      getDatabaseActionErrorMessage(
        error,
        "Не удалось загрузить данные клиента. Попробуйте ещё раз.",
      ),
    );
  }

  if (!client) {
    return getActionError("Клиент не найден.");
  }

  try {
    await prisma.user.update({
      where: {
        id: clientId,
      },
      data: {
        notes: notes || null,
      },
    });
  } catch (error) {
    logPrismaError("trainer.updateTrainerClientNotes", error, startedAt);

    return getActionError(
      getDatabaseActionErrorMessage(
        error,
        "Не удалось сохранить заметки. Попробуйте ещё раз.",
      ),
    );
  }

  revalidatePath("/trainer");
  revalidatePath("/trainer/clients");
  revalidatePath(`/trainer/clients/${clientId}`);
  revalidatePath(`/trainer/clients/${clientId}/notes`);

  return {
    ok: true,
  };
}

export type UpdateTrainerClientNotesActionState =
  | {
      ok: true;
    }
  | ActionState;

export async function claimFreeSlot(
  sessionId: string,
  prevState?: ActionState,
): Promise<ActionState> {
  void prevState;
  const user = await requireUser("trainer");
  const startedAt = Date.now();

  try {
    await prisma.$transaction(async (tx) => {
      const session = await tx.session.findFirst({
        where: {
          id: sessionId,
          type: "group",
          origin: "auto_free",
          status: "scheduled",
        },
        select: { id: true, version: true },
      });

      if (!session) {
        throw new Error("Слот не найден или уже занят другим тренером.");
      }

      await tx.session.update({
        where: { id: sessionId, version: session.version },
        data: {
          origin: "manual",
          autoSlotKey: null,
          trainerId: user.id,
          version: { increment: 1 },
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Слот не найден")) {
      return getActionError(error.message);
    }
    logPrismaError("trainer.claimFreeSlot", error, startedAt);
    return getActionError(
      getDatabaseActionErrorMessage(error, "Не удалось занять слот. Попробуйте ещё раз."),
    );
  }

  revalidatePath("/trainer/schedule");
  revalidatePath("/trainer");

  redirect(`/trainer/schedule?toast=slot-claimed`);
}
