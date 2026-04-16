import { describe, expect, it } from "vitest";
import { exerciseCatalogSchema, workoutLogSchema } from "@/features/workouts/schemas";

describe("workout schemas", () => {
  it("валидирует базовую форму тренировки", () => {
    const parsed = workoutLogSchema.safeParse({
      performedAt: "2026-04-16T10:30",
      durationMin: "60",
      rpe: "6",
      notes: "Хорошее самочувствие",
      exerciseIds: [],
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.durationMin).toBe(60);
      expect(parsed.data.rpe).toBe(6);
    }
  });

  it("отклоняет неверный datetime", () => {
    const parsed = workoutLogSchema.safeParse({
      performedAt: "16-04-2026 10:30",
      durationMin: "60",
      rpe: "6",
      notes: "",
      exerciseIds: [],
    });

    expect(parsed.success).toBe(false);
  });

  it("валидирует справочник упражнений", () => {
    const parsed = exerciseCatalogSchema.safeParse({
      name: "Выпады",
      category: "strength_legs",
      equipment: "bodyweight",
      description: "",
      videoUrl: "",
      isActive: true,
    });

    expect(parsed.success).toBe(true);
  });
});
