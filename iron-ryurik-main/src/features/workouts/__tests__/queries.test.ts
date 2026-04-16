import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: {
    findFirst: vi.fn(),
  },
  workoutLog: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
  exercise: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import {
  canTrainerAccessClient,
  getClientWorkoutLogById,
  listClientWorkoutLogs,
  listExercises,
} from "@/features/workouts/queries";

describe("workouts queries", () => {
  beforeEach(() => {
    prismaMock.user.findFirst.mockReset();
    prismaMock.workoutLog.findMany.mockReset();
    prismaMock.workoutLog.findFirst.mockReset();
    prismaMock.exercise.findMany.mockReset();
    prismaMock.exercise.findUnique.mockReset();
  });

  it("проверяет доступ тренера к клиенту", async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce({ id: "client-1" });
    prismaMock.user.findFirst.mockResolvedValueOnce(null);

    await expect(canTrainerAccessClient("trainer-1", "client-1")).resolves.toBe(true);
    await expect(canTrainerAccessClient("trainer-1", "client-2")).resolves.toBe(false);
  });

  it("запрашивает список тренировок клиента", async () => {
    prismaMock.workoutLog.findMany.mockResolvedValue([{ id: "log-1" }]);

    await expect(listClientWorkoutLogs("client-1", "week")).resolves.toEqual([
      { id: "log-1" },
    ]);
    expect(prismaMock.workoutLog.findMany).toHaveBeenCalled();
  });

  it("получает тренировку клиента по id", async () => {
    prismaMock.workoutLog.findFirst.mockResolvedValue({ id: "log-1", exercises: [] });

    await expect(getClientWorkoutLogById("client-1", "log-1")).resolves.toEqual({
      id: "log-1",
      exercises: [],
    });
  });

  it("фильтрует только активные упражнения по умолчанию", async () => {
    prismaMock.exercise.findMany.mockResolvedValue([{ id: "ex-1", isActive: true }]);

    await listExercises();
    expect(prismaMock.exercise.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isActive: true,
        },
      }),
    );
  });
});
