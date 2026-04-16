import { describe, expect, it } from "vitest";
import { trainerSlotSchema } from "@/features/trainer/schemas";

describe("trainer slot schema", () => {
  it("не пропускает прошедшую дату", () => {
    const parsed = trainerSlotSchema.safeParse({
      title: "Утренняя тренировка",
      description: "",
      date: "2000-01-01",
      startTime: "09:00",
      durationMinutes: "60",
    });

    expect(parsed.success).toBe(false);
  });

  it("не пропускает слишком короткую длительность", () => {
    const parsed = trainerSlotSchema.safeParse({
      title: "Утренняя тренировка",
      description: "",
      date: "2099-01-01",
      startTime: "09:00",
      durationMinutes: "10",
    });

    expect(parsed.success).toBe(false);

    if (parsed.success) {
      return;
    }

    expect(parsed.error.flatten().fieldErrors.durationMinutes).toContain(
      "Минимум 15 минут",
    );
  });

  it("разрешает пустой title и description", () => {
    const parsed = trainerSlotSchema.safeParse({
      title: "",
      description: "",
      date: "2099-01-01",
      startTime: "09:00",
      durationMinutes: "60",
    });

    expect(parsed.success).toBe(true);

    if (!parsed.success) {
      return;
    }

    expect(parsed.data.title).toBe("");
    expect(parsed.data.description).toBe("");
  });
});
