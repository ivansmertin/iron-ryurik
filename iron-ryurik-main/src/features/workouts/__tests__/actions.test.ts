import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUserMock = vi.hoisted(() => vi.fn());
const canTrainerAccessClientMock = vi.hoisted(() => vi.fn());
const getClientWorkoutLogByIdMock = vi.hoisted(() => vi.fn());
const redirectMock = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
);
const prismaMock = vi.hoisted(() => ({
  workoutLog: {
    create: vi.fn(),
    update: vi.fn(),
  },
  exerciseLog: {
    createMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  exercise: {
    create: vi.fn(),
  },
  $transaction: vi.fn(
    async (
      callback: (tx: {
        workoutLog: typeof prismaMock.workoutLog;
        exerciseLog: typeof prismaMock.exerciseLog;
      }) => Promise<void>,
    ) =>
      callback({
        workoutLog: prismaMock.workoutLog,
        exerciseLog: prismaMock.exerciseLog,
      }),
  ),
}));

vi.mock("@/features/auth/get-user", () => ({
  requireUser: requireUserMock,
}));

vi.mock("@/features/workouts/queries", () => ({
  canTrainerAccessClient: canTrainerAccessClientMock,
  getClientWorkoutLogById: getClientWorkoutLogByIdMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

import {
  createClientWorkoutLog,
  createTrainerClientWorkoutLog,
} from "@/features/workouts/actions";

describe("workout actions", () => {
  beforeEach(() => {
    requireUserMock.mockReset();
    canTrainerAccessClientMock.mockReset();
    getClientWorkoutLogByIdMock.mockReset();
    redirectMock.mockReset();
    prismaMock.workoutLog.create.mockReset();
    prismaMock.exerciseLog.createMany.mockReset();
    prismaMock.$transaction.mockClear();
  });

  it("создаёт запись клиента и редиректит в дневник", async () => {
    requireUserMock.mockResolvedValue({ id: "client-1", role: "client" });
    prismaMock.workoutLog.create.mockResolvedValue({ id: "log-1" });
    prismaMock.exerciseLog.createMany.mockResolvedValue({ count: 1 });

    const formData = new FormData();
    formData.set("performedAt", "2026-04-16T10:00");
    formData.set("durationMin", "45");
    formData.set("rpe", "6");
    formData.set("notes", "Отличная тренировка");
    formData.append("exerciseIds", "550e8400-e29b-41d4-a716-446655440000");

    await expect(createClientWorkoutLog(undefined, formData)).rejects.toThrow(
      "redirect:/client/diary?toast=workout-created",
    );
    expect(prismaMock.workoutLog.create).toHaveBeenCalled();
  });

  it("блокирует создание тренировки тренером без доступа к клиенту", async () => {
    requireUserMock.mockResolvedValue({ id: "trainer-1", role: "trainer" });
    canTrainerAccessClientMock.mockResolvedValue(false);

    const formData = new FormData();
    formData.set("performedAt", "2026-04-16T10:00");
    formData.set("durationMin", "45");
    formData.set("rpe", "6");
    formData.set("notes", "");

    await expect(
      createTrainerClientWorkoutLog("client-1", undefined, formData),
    ).resolves.toEqual({
      ok: false,
      error: "Клиент недоступен для тренера.",
    });
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
