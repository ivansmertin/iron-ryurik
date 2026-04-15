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
import { cancelSessionWithDb } from "./service";
import { createSessionSchema, updateSessionSchema } from "./schemas";

function buildScheduleRedirect(toast: string) {
  return `/admin/schedule?toast=${encodeURIComponent(toast)}`;
}

function getSessionPayload(formData: FormData) {
  return {
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    date: String(formData.get("date") ?? ""),
    startTime: String(formData.get("startTime") ?? ""),
    durationMinutes: String(formData.get("durationMinutes") ?? ""),
    capacity: String(formData.get("capacity") ?? ""),
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

  try {
    await prisma.session.create({
      data: {
        type: "group",
        trainerId: null,
        title: parsed.data.title,
        description: parsed.data.description || null,
        startsAt,
        durationMinutes: parsed.data.durationMinutes,
        capacity: parsed.data.capacity,
      },
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
        startsAt: true,
        durationMinutes: true,
        capacity: true,
        status: true,
        version: true,
        bookings: {
          where: {
            status: "booked",
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
        title: parsed.data.title,
        description: parsed.data.description || null,
        startsAt,
        durationMinutes: parsed.data.durationMinutes,
        capacity: parsed.data.capacity,
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
