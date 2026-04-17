import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withPrismaReadRetry } from "@/lib/prisma-read";

export const diaryTabs = ["week", "month", "all"] as const;
export type DiaryTab = (typeof diaryTabs)[number];

function getClientScopeRange(tab: DiaryTab) {
  const now = new Date();

  if (tab === "all") {
    return null;
  }

  const days = tab === "week" ? 7 : 30;
  const start = new Date(now);
  start.setDate(now.getDate() - days);
  return { gte: start };
}

function trainerClientScope(trainerId: string, clientId: string): Prisma.UserWhereInput {
  return {
    id: clientId,
    role: "client",
    deletedAt: null,
    programs: {
      some: {
        trainerId,
      },
    },
  };
}

export async function canTrainerAccessClient(trainerId: string, clientId: string) {
  const client = await withPrismaReadRetry(
    () =>
      prisma.user.findFirst({
        where: trainerClientScope(trainerId, clientId),
        select: { id: true },
      }),
    1,
    "workouts.canTrainerAccessClient",
  );

  return Boolean(client);
}

export async function listClientWorkoutLogs(clientId: string, tab: DiaryTab) {
  const range = getClientScopeRange(tab);

  return withPrismaReadRetry(
    () =>
      prisma.workoutLog.findMany({
        where: {
          userId: clientId,
          ...(range ? { performedAt: range } : {}),
        },
        orderBy: {
          performedAt: "desc",
        },
        select: {
          id: true,
          performedAt: true,
          durationMin: true,
          rpe: true,
          notes: true,
          session: {
            select: {
              id: true,
              title: true,
            },
          },
          exercises: {
            select: {
              id: true,
            },
          },
        },
      }),
    1,
    "workouts.listClientWorkoutLogs",
  );
}

export async function getClientWorkoutLogById(clientId: string, workoutLogId: string) {
  return withPrismaReadRetry(
    () =>
      prisma.workoutLog.findFirst({
        where: {
          id: workoutLogId,
          userId: clientId,
        },
        select: {
          id: true,
          userId: true,
          sessionId: true,
          performedAt: true,
          durationMin: true,
          rpe: true,
          notes: true,
          session: {
            select: {
              id: true,
              title: true,
            },
          },
          exercises: {
            orderBy: {
              orderIndex: "asc",
            },
            select: {
              id: true,
              orderIndex: true,
              notes: true,
              sets: true,
              exercise: {
                select: {
                  id: true,
                  name: true,
                  category: true,
                  equipment: true,
                },
              },
            },
          },
        },
      }),
    1,
    "workouts.getClientWorkoutLogById",
  );
}

export async function listClientWorkoutLogsWithoutNotes(clientId: string) {
  return withPrismaReadRetry(
    () =>
      prisma.workoutLog.findMany({
        where: {
          userId: clientId,
          sessionId: {
            not: null,
          },
          OR: [
            {
              notes: null,
            },
            {
              notes: "",
            },
          ],
        },
        orderBy: {
          performedAt: "desc",
        },
        take: 5,
        select: {
          id: true,
          performedAt: true,
          session: {
            select: {
              title: true,
            },
          },
        },
      }),
    1,
    "workouts.listClientWorkoutLogsWithoutNotes",
  );
}

export async function listTrainerClientWorkoutLogs(
  trainerId: string,
  clientId: string,
  tab: DiaryTab,
) {
  const hasAccess = await canTrainerAccessClient(trainerId, clientId);
  if (!hasAccess) {
    return null;
  }

  const items = await listClientWorkoutLogs(clientId, tab);
  return items;
}

export async function getTrainerClientWorkoutLogById(
  trainerId: string,
  clientId: string,
  workoutLogId: string,
) {
  const hasAccess = await canTrainerAccessClient(trainerId, clientId);
  if (!hasAccess) {
    return null;
  }

  return getClientWorkoutLogById(clientId, workoutLogId);
}

export async function listExercises(options?: { includeInactive?: boolean }) {
  const includeInactive = options?.includeInactive ?? false;

  return withPrismaReadRetry(
    () =>
      prisma.exercise.findMany({
        where: includeInactive ? undefined : { isActive: true },
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          category: true,
          equipment: true,
          isActive: true,
        },
      }),
    1,
    "workouts.listExercises",
  );
}

export async function getExerciseById(exerciseId: string) {
  return withPrismaReadRetry(
    () =>
      prisma.exercise.findUnique({
        where: {
          id: exerciseId,
        },
        select: {
          id: true,
          name: true,
          category: true,
          equipment: true,
          description: true,
          videoUrl: true,
          isActive: true,
        },
      }),
    1,
    "workouts.getExerciseById",
  );
}

export async function getExercises(activeOnly: boolean = false) {
  return listExercises({ includeInactive: !activeOnly });
}
