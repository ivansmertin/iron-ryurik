"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/features/auth/get-user";
import {
  canTrainerAccessClient,
  getClientWorkoutLogById,
} from "@/features/workouts/queries";
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
import { exerciseCatalogSchema, workoutLogSchema } from "./schemas";

function toDateFromDateTimeLocal(value: string) {
  return new Date(`${value}:00`);
}

function getWorkoutLogPayload(formData: FormData) {
  return {
    performedAt: String(formData.get("performedAt") ?? ""),
    durationMin: String(formData.get("durationMin") ?? ""),
    rpe: String(formData.get("rpe") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    exerciseIds: formData
      .getAll("exerciseIds")
      .map((value) => String(value))
      .filter(Boolean),
  };
}

function getExercisePayload(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    category: String(formData.get("category") ?? ""),
    equipment: String(formData.get("equipment") ?? ""),
    description: String(formData.get("description") ?? ""),
    videoUrl: String(formData.get("videoUrl") ?? ""),
    isActive: formData.get("isActive") === "on",
  };
}

function getClientDiaryRedirect(toast: string) {
  return `/client/diary?toast=${encodeURIComponent(toast)}`;
}

function getTrainerDiaryRedirect(clientId: string, toast: string) {
  return `/trainer/clients/${clientId}/diary?toast=${encodeURIComponent(toast)}`;
}

function getExercisesRedirect(toast: string) {
  return `/admin/exercises?toast=${encodeURIComponent(toast)}`;
}

async function upsertWorkoutLog(
  actorRole: "client" | "trainer",
  actorId: string,
  targetClientId: string,
  _prevState: ActionState,
  formData: FormData,
  workoutLogId?: string,
): Promise<ActionState> {
  const parsed = workoutLogSchema.safeParse(getWorkoutLogPayload(formData));
  if (!parsed.success) {
    return getActionFieldErrorsFromZodError(parsed.error);
  }

  if (actorRole === "trainer") {
    const hasAccess = await canTrainerAccessClient(actorId, targetClientId);
    if (!hasAccess) {
      return getActionError("Клиент недоступен для тренера.");
    }
  }

  const startedAt = Date.now();

  try {
    if (workoutLogId) {
      const existingLog = await getClientWorkoutLogById(targetClientId, workoutLogId);
      if (!existingLog) {
        return getActionError("Тренировка не найдена.");
      }

      await prisma.$transaction(async (tx) => {
        await tx.workoutLog.update({
          where: { id: workoutLogId },
          data: {
            performedAt: toDateFromDateTimeLocal(parsed.data.performedAt),
            durationMin: parsed.data.durationMin ?? null,
            rpe: parsed.data.rpe ?? null,
            notes: parsed.data.notes || null,
          },
        });

        await tx.exerciseLog.deleteMany({
          where: { workoutLogId },
        });

        if (parsed.data.exerciseIds.length) {
          await tx.exerciseLog.createMany({
            data: parsed.data.exerciseIds.map((exerciseId, index) => ({
              workoutLogId,
              exerciseId,
              orderIndex: index,
              sets: [],
              notes: null,
            })),
          });
        }
      });
    } else {
      await prisma.$transaction(async (tx) => {
        const created = await tx.workoutLog.create({
          data: {
            userId: targetClientId,
            performedAt: toDateFromDateTimeLocal(parsed.data.performedAt),
            durationMin: parsed.data.durationMin ?? null,
            rpe: parsed.data.rpe ?? null,
            notes: parsed.data.notes || null,
          },
          select: { id: true },
        });

        if (parsed.data.exerciseIds.length) {
          await tx.exerciseLog.createMany({
            data: parsed.data.exerciseIds.map((exerciseId, index) => ({
              workoutLogId: created.id,
              exerciseId,
              orderIndex: index,
              sets: [],
              notes: null,
            })),
          });
        }
      });
    }
  } catch (error) {
    logPrismaError("workouts.upsertWorkoutLog", error, startedAt);
    return getActionError(
      getDatabaseActionErrorMessage(
        error,
        "Не удалось сохранить тренировку. Попробуйте ещё раз.",
      ),
    );
  }

  if (actorRole === "client") {
    redirect(getClientDiaryRedirect(workoutLogId ? "workout-updated" : "workout-created"));
  }

  redirect(
    getTrainerDiaryRedirect(
      targetClientId,
      workoutLogId ? "workout-updated" : "workout-created",
    ),
  );
}

export async function createClientWorkoutLog(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("client");
  return upsertWorkoutLog("client", user.id, user.id, prevState, formData);
}

export async function updateClientWorkoutLog(
  workoutLogId: string,
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("client");
  return upsertWorkoutLog("client", user.id, user.id, prevState, formData, workoutLogId);
}

export async function createTrainerClientWorkoutLog(
  clientId: string,
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("trainer");
  return upsertWorkoutLog("trainer", user.id, clientId, prevState, formData);
}

export async function updateTrainerClientWorkoutLog(
  clientId: string,
  workoutLogId: string,
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("trainer");
  return upsertWorkoutLog(
    "trainer",
    user.id,
    clientId,
    prevState,
    formData,
    workoutLogId,
  );
}

export async function createExercise(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser("admin");
  const parsed = exerciseCatalogSchema.safeParse(getExercisePayload(formData));

  if (!parsed.success) {
    return getActionFieldErrorsFromZodError(parsed.error);
  }

  const startedAt = Date.now();

  try {
    await prisma.exercise.create({
      data: {
        name: parsed.data.name,
        category: parsed.data.category,
        equipment: parsed.data.equipment,
        description: parsed.data.description || null,
        videoUrl: parsed.data.videoUrl || null,
        isActive: parsed.data.isActive,
      },
    });
  } catch (error) {
    logPrismaError("workouts.createExercise", error, startedAt);
    return getActionError(
      getDatabaseActionErrorMessage(
        error,
        "Не удалось создать упражнение. Попробуйте ещё раз.",
      ),
    );
  }

  redirect(getExercisesRedirect("exercise-created"));
}

export async function updateExercise(
  exerciseId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser("admin");
  const parsed = exerciseCatalogSchema.safeParse(getExercisePayload(formData));
  if (!parsed.success) {
    return getActionFieldErrorsFromZodError(parsed.error);
  }

  const startedAt = Date.now();

  try {
    await prisma.exercise.update({
      where: {
        id: exerciseId,
      },
      data: {
        name: parsed.data.name,
        category: parsed.data.category,
        equipment: parsed.data.equipment,
        description: parsed.data.description || null,
        videoUrl: parsed.data.videoUrl || null,
        isActive: parsed.data.isActive,
      },
    });
  } catch (error) {
    logPrismaError("workouts.updateExercise", error, startedAt);
    return getActionError(
      getDatabaseActionErrorMessage(
        error,
        "Не удалось обновить упражнение. Попробуйте ещё раз.",
        { preserveKnownErrorMessage: true },
      ),
    );
  }

  redirect(getExercisesRedirect("exercise-updated"));
}

export async function deleteExercise(
  exerciseId: string,
  prevState?: ActionState,
): Promise<ActionState> {
  void prevState;
  await requireUser("admin");

  const startedAt = Date.now();

  try {
    await prisma.exercise.delete({
      where: {
        id: exerciseId,
      },
    });
  } catch (error) {
    logPrismaError("workouts.deleteExercise", error, startedAt);
    return getActionError(
      getDatabaseActionErrorMessage(
        error,
        "Не удалось удалить упражнение. Если оно уже используется, отключите его.",
        { preserveKnownErrorMessage: true },
      ),
    );
  }

  redirect(getExercisesRedirect("exercise-deleted"));
}
