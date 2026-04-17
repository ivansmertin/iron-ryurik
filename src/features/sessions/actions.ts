"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/features/auth/get-user";
import {
  sendBestEffortEmails,
  sendSessionCancellationEmail,
} from "@/lib/email/notifications";
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
import { FREE_SLOT_TITLE, buildAutoSlotKey } from "@/features/gym-schedule/service";
import { cancelSessionWithDb } from "./service";
import { createSessionSchema, updateSessionSchema } from "./schemas";

const ACTIVE_BOOKING_STATUSES = ["pending", "completed", "no_show"] as const;

function buildScheduleRedirect(toast: string) {
  return `/admin/schedule?toast=${encodeURIComponent(toast)}`;
}

function getSessionPayload(formData: FormData) {
  return {
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    trainerId: String(formData.get("trainerId") ?? ""),
    date: String(formData.get("date") ?? ""),
    startTime: String(formData.get("startTime") ?? ""),
    durationMinutes: String(formData.get("durationMinutes") ?? ""),
    capacity: String(formData.get("capacity") ?? ""),
    cancellationDeadlineHours: String(formData.get("cancellationDeadlineHours") ?? ""),
    dropInEnabled: formData.get("dropInEnabled") === "on",
    dropInPrice: formData.get("dropInPrice") ? String(formData.get("dropInPrice")) : undefined,
  };
}

export async function createSession(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser("admin");

  const parsed = createSessionSchema.safeParse(getSessionPayload(formData));

  if (!parsed.success) {
    return getActionFieldErrorsFromZodError(parsed.error);
  }

  const startsAt = createUtcDateFromMoscowDateTime(
    parsed.data.date,
    parsed.data.startTime,
  );

  if (!startsAt) {
    return getActionError("Не удалось прочитать дату и время занятия.");
  }

  const startedAt = Date.now();
  const trainerId = parsed.data.trainerId || null;

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
            trainerId,
            title: parsed.data.title,
            description: parsed.data.description || null,
            durationMinutes: activeBookingsCount
              ? existingFreeSlot.durationMinutes
              : parsed.data.durationMinutes,
            capacity: Math.max(parsed.data.capacity, activeBookingsCount),
            cancellationDeadlineHours: parsed.data.cancellationDeadlineHours,
            dropInEnabled: parsed.data.dropInEnabled,
            dropInPrice: parsed.data.dropInPrice,
            version: {
              increment: 1,
            },
          },
        });
        return;
      }

      await tx.session.create({
        data: {
          type: "group",
          origin: "manual",
          trainerId,
          title: parsed.data.title,
          description: parsed.data.description || null,
          startsAt,
          durationMinutes: parsed.data.durationMinutes,
          capacity: parsed.data.capacity,
          cancellationDeadlineHours: parsed.data.cancellationDeadlineHours,
          dropInEnabled: parsed.data.dropInEnabled,
          dropInPrice: parsed.data.dropInPrice,
        },
      });
    });
  } catch (error) {
    logPrismaError("sessions.createSession", error, startedAt);

    return getActionError(
      getDatabaseActionErrorMessage(
        error,
        "Не удалось создать сессию. Попробуйте ещё раз.",
      ),
    );
  }

  redirect(buildScheduleRedirect("session-created"));
}

export async function updateSession(
  sessionId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser("admin");

  const startedAt = Date.now();

  try {
    const existingSession = await prisma.session.findFirst({
      where: {
        id: sessionId,
        type: "group",
      },
      select: {
        id: true,
        title: true,
        origin: true,
        startsAt: true,
        durationMinutes: true,
        capacity: true,
        status: true,
        version: true,
        bookings: {
          where: {
            status: {
              in: ["pending", "completed", "no_show"],
            },
          },
          select: {
            id: true,
          },
        },
      },
    });

    if (!existingSession) {
      return getActionError("Занятие не найдено.");
    }

    if (existingSession.status === "cancelled") {
      return getActionError("Нельзя редактировать отменённое занятие.");
    }

    const schema = updateSessionSchema({
      hasActiveBookings: existingSession.bookings.length > 0,
      isPastSession: existingSession.startsAt < new Date(),
      currentStartsAt: existingSession.startsAt,
      currentDurationMinutes: existingSession.durationMinutes,
      currentCapacity: existingSession.capacity,
    });

    const parsed = schema.safeParse(getSessionPayload(formData));

    if (!parsed.success) {
      return getActionFieldErrorsFromZodError(parsed.error);
    }

    const startsAt = createUtcDateFromMoscowDateTime(
      parsed.data.date,
      parsed.data.startTime,
    );

    if (!startsAt) {
      return getActionError("Не удалось прочитать дату и время занятия.");
    }

    await prisma.session.update({
      where: {
        id: sessionId,
      },
      data: {
        origin:
          existingSession.origin === "auto_free" &&
          (parsed.data.title !== FREE_SLOT_TITLE ||
            parsed.data.description ||
            parsed.data.trainerId)
            ? "manual"
            : undefined,
        autoSlotKey:
          existingSession.origin === "auto_free" &&
          (parsed.data.title !== FREE_SLOT_TITLE ||
            parsed.data.description ||
            parsed.data.trainerId)
            ? null
            : undefined,
        title: parsed.data.title,
        description: parsed.data.description || null,
        trainerId: parsed.data.trainerId || null,
        startsAt,
        durationMinutes: parsed.data.durationMinutes,
        capacity: parsed.data.capacity,
        cancellationDeadlineHours: parsed.data.cancellationDeadlineHours,
        dropInEnabled: parsed.data.dropInEnabled,
        dropInPrice: parsed.data.dropInPrice,
        version: {
          increment: 1,
        },
      },
    });
  } catch (error) {
    logPrismaError("sessions.updateSession", error, startedAt);

    return getActionError(
      getDatabaseActionErrorMessage(
        error,
        "Не удалось сохранить изменения занятия. Попробуйте ещё раз.",
        {
          preserveKnownErrorMessage: true,
        },
      ),
    );
  }

  redirect(buildScheduleRedirect("session-updated"));
}

export async function cancelSession(
  sessionId: string,
  prevState?: ActionState,
): Promise<ActionState> {
  void prevState;
  await requireUser("admin");

  const startedAt = Date.now();
  let cancelledBookingsCount = 0;

  try {
    const result = await prisma.$transaction((tx) =>
      cancelSessionWithDb(tx, sessionId),
    );
    cancelledBookingsCount = result.cancelledBookingsCount;

    await sendBestEffortEmails(
      result.recipients.map((recipient) =>
        sendSessionCancellationEmail({
          to: recipient.email,
          fullName: recipient.fullName,
          sessionTitle: result.session.title,
          startsAt: result.session.startsAt,
          durationMinutes: result.session.durationMinutes,
        }),
      ),
      "cancelSession",
    );
  } catch (error) {
    logPrismaError("sessions.cancelSession", error, startedAt);

    return getActionError(
      getDatabaseActionErrorMessage(
        error,
        "Не удалось отменить занятие.",
        {
          preserveKnownErrorMessage: true,
        },
      ),
    );
  }

  redirect(buildScheduleRedirect(`session-cancelled:${cancelledBookingsCount}`));
}

export async function returnSessionToFreeSlot(
  sessionId: string,
  prevState?: ActionState,
): Promise<ActionState> {
  void prevState;
  await requireUser("admin");

  const startedAt = Date.now();

  try {
    const session = await prisma.session.findFirst({
      where: {
        id: sessionId,
        type: "group",
      },
      select: {
        id: true,
        status: true,
        startsAt: true,
        durationMinutes: true,
      },
    });

    if (!session) {
      return getActionError("Занятие не найдено.");
    }

    if (session.status !== "scheduled" || session.startsAt <= new Date()) {
      return getActionError("В свободный слот можно вернуть только будущее занятие.");
    }

    await prisma.session.update({
      where: {
        id: session.id,
      },
      data: {
        origin: "auto_free",
        autoSlotKey: buildAutoSlotKey(session.startsAt),
        title: FREE_SLOT_TITLE,
        description: null,
        trainerId: null,
        durationMinutes: session.durationMinutes,
        cancellationDeadlineHours: 2,
        version: {
          increment: 1,
        },
      },
    });
  } catch (error) {
    logPrismaError("sessions.returnSessionToFreeSlot", error, startedAt);

    return getActionError(
      getDatabaseActionErrorMessage(
        error,
        "Не удалось вернуть занятие в свободный слот.",
        {
          preserveKnownErrorMessage: true,
        },
      ),
    );
  }

  redirect(buildScheduleRedirect("session-updated"));
}
