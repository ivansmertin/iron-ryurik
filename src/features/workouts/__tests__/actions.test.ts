import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/features/auth/get-user";
import { redirect } from "next/navigation";
import {
  createClientWorkoutLog,
  updateClientWorkoutLog,
  createTrainerClientWorkoutLog,
  deleteExercise,
} from "../actions";
import { canTrainerAccessClient, getClientWorkoutLogById } from "../queries";

vi.mock("@/lib/prisma", () => ({
  prisma: mockDeep<any>(),
}));

vi.mock("@/features/auth/get-user", () => ({
  requireUser: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("../queries", () => ({
  canTrainerAccessClient: vi.fn(),
  getClientWorkoutLogById: vi.fn(),
}));

describe("Workouts Actions", () => {
  beforeEach(() => {
    mockReset(prisma as any);
    vi.clearAllMocks();
  });

  const mockClient = { id: "client-1", role: "client" };
  const mockTrainer = { id: "trainer-1", role: "trainer" };
  const mockExerciseId = "00000000-0000-0000-0000-000000000000";

  function createWorkoutFormData() {
    const formData = new FormData();
    formData.append("performedAt", "2024-04-17T10:00");
    formData.append("durationMin", "60");
    formData.append("rpe", "8");
    formData.append("notes", "Great workout");
    formData.append("exerciseIds", mockExerciseId);
    return formData;
  }

  describe("createClientWorkoutLog", () => {
    it("successfully creates a workout log as a client", async () => {
      vi.mocked(requireUser).mockResolvedValue(mockClient as any);
      const formData = createWorkoutFormData();

      (prisma.$transaction as any).mockImplementation(async (cb: any) => {
        return cb(prisma);
      });

      vi.mocked(prisma.workoutLog.create).mockResolvedValue({ id: "log-1" } as any);

      await createClientWorkoutLog({}, formData);

      expect(prisma.workoutLog.create).toHaveBeenCalled();
      expect(prisma.exerciseLog.createMany).toHaveBeenCalledWith({
        data: [
          {
            workoutLogId: "log-1",
            exerciseId: mockExerciseId,
            orderIndex: 0,
            sets: [],
            notes: null,
          },
        ],
      });
      expect(redirect).toHaveBeenCalledWith(expect.stringContaining("workout-created"));
    });
  });

  describe("updateClientWorkoutLog", () => {
    it("successfully updates an existing workout log", async () => {
      vi.mocked(requireUser).mockResolvedValue(mockClient as any);
      const formData = createWorkoutFormData();
      const logId = "log-1";

      vi.mocked(getClientWorkoutLogById).mockResolvedValue({ id: logId, userId: mockClient.id } as any);
      (prisma.$transaction as any).mockImplementation(async (cb: any) => {
        return cb(prisma);
      });

      await updateClientWorkoutLog(logId, {}, formData);

      expect(prisma.workoutLog.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: logId },
        })
      );
      expect(prisma.exerciseLog.deleteMany).toHaveBeenCalledWith({ where: { workoutLogId: logId } });
      expect(prisma.exerciseLog.createMany).toHaveBeenCalled();
      expect(redirect).toHaveBeenCalledWith(expect.stringContaining("workout-updated"));
    });
  });

  describe("createTrainerClientWorkoutLog", () => {
    it("successfully creates a workout log for a client as a trainer", async () => {
      vi.mocked(requireUser).mockResolvedValue(mockTrainer as any);
      vi.mocked(canTrainerAccessClient).mockResolvedValue(true);
      const formData = createWorkoutFormData();

      (prisma.$transaction as any).mockImplementation(async (cb: any) => {
        return cb(prisma);
      });
      vi.mocked(prisma.workoutLog.create).mockResolvedValue({ id: "log-2" } as any);

      await createTrainerClientWorkoutLog(mockClient.id, {}, formData);

      expect(prisma.workoutLog.create).toHaveBeenCalled();
      expect(redirect).toHaveBeenCalledWith(expect.stringContaining("workout-created"));
    });

    it("returns error if trainer has no access to client", async () => {
      vi.mocked(requireUser).mockResolvedValue(mockTrainer as any);
      vi.mocked(canTrainerAccessClient).mockResolvedValue(false);
      const formData = createWorkoutFormData();

      const result = await createTrainerClientWorkoutLog(mockClient.id, {}, formData);

      expect(result.error).toBe("Клиент недоступен для тренера.");
      expect(prisma.workoutLog.create).not.toHaveBeenCalled();
    });
  });

  describe("deleteExercise", () => {
    it("successfully deletes an exercise as admin", async () => {
      vi.mocked(requireUser).mockResolvedValue({ id: "admin-1", role: "admin" } as any);
      const exerciseId = "ex-1";

      await deleteExercise(exerciseId);

      expect(prisma.exercise.delete).toHaveBeenCalledWith({
        where: { id: exerciseId },
      });
      expect(redirect).toHaveBeenCalledWith(expect.stringContaining("exercise-deleted"));
    });
  });
});
