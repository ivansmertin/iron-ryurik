import { describe, expect, it } from "vitest";
import {
  createSessionSchema,
  updateSessionSchema,
} from "@/features/sessions/schemas";

describe("session schemas", () => {
  it("createSessionSchema не пропускает прошедшую дату", () => {
    const parsed = createSessionSchema.safeParse({
      title: "Утренняя группа",
      description: "",
      date: "2000-01-01",
      startTime: "09:00",
      durationMinutes: "60",
      capacity: "8",
    });

    expect(parsed.success).toBe(false);
  });

  it("updateSessionSchema разрешает менять title и description при активных записях", () => {
    const schema = updateSessionSchema({
      hasActiveBookings: true,
      currentStartsAt: new Date("2099-01-01T15:00:00.000Z"),
      currentDurationMinutes: 60,
      currentCapacity: 8,
    });

    const parsed = schema.safeParse({
      title: "Новый заголовок",
      description: "Новое описание",
      date: "2099-01-01",
      startTime: "18:00",
      durationMinutes: "60",
      capacity: "8",
    });

    expect(parsed.success).toBe(true);
  });

  it("updateSessionSchema запрещает снижать capacity при активных записях", () => {
    const schema = updateSessionSchema({
      hasActiveBookings: true,
      currentStartsAt: new Date("2099-01-01T15:00:00.000Z"),
      currentDurationMinutes: 60,
      currentCapacity: 8,
    });

    const parsed = schema.safeParse({
      title: "Новый заголовок",
      description: "Новое описание",
      date: "2099-01-01",
      startTime: "18:00",
      durationMinutes: "60",
      capacity: "7",
    });

    expect(parsed.success).toBe(false);

    if (parsed.success) {
      return;
    }

    expect(parsed.error.flatten().fieldErrors.capacity).toContain(
      "Нельзя уменьшить вместимость: уже есть записи",
    );
  });
});
