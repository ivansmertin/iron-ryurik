import { z } from "zod/v4";
import { createUtcDateFromMoscowDateTime } from "@/lib/datetime";

const sessionBaseSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Укажите название")
    .max(200, "Максимум 200 символов"),
  description: z
    .string()
    .trim()
    .max(1000, "Максимум 1000 символов")
    .optional()
    .default(""),
  trainerId: z.string().uuid("Некорректный тренер").optional().or(z.literal("")).default(""),
  date: z.string().min(1, "Укажите дату"),
  startTime: z.string().min(1, "Укажите время начала"),
  durationMinutes: z.coerce
    .number()
    .int("Введите целое число")
    .min(15, "Минимум 15 минут")
    .max(240, "Максимум 240 минут")
    .refine((value) => value % 5 === 0, "Длительность должна быть кратна 5 минутам"),
  capacity: z.coerce
    .number()
    .int("Введите целое число")
    .min(1, "Минимум 1 место")
    .max(20, "Максимум 20 мест"),
  cancellationDeadlineHours: z.coerce
    .number()
    .int("Введите целое число")
    .min(0, "Минимум 0 часов")
    .max(72, "Максимум 72 часа"),
  dropInEnabled: z.boolean().default(false),
  dropInPrice: z.coerce
    .number()
    .min(0, "Минимум 0 руб.")
    .optional()
    .nullable(),
}).superRefine((value, ctx) => {
  if (value.dropInEnabled && (value.dropInPrice === null || value.dropInPrice === undefined)) {
    ctx.addIssue({
      code: "custom",
      path: ["dropInPrice"],
      message: "Укажите цену для разового визита",
    });
  }
});

function addInvalidDateIssue(
  ctx: z.RefinementCtx,
  path: "date" | "startTime",
  message: string,
) {
  ctx.addIssue({
    code: "custom",
    path: [path],
    message,
  });
}

export const createSessionSchema = sessionBaseSchema.superRefine((value, ctx) => {
  const startsAt = createUtcDateFromMoscowDateTime(value.date, value.startTime);

  if (!startsAt) {
    addInvalidDateIssue(ctx, "date", "Введите корректные дату и время");
    return;
  }

  if (startsAt <= new Date()) {
    addInvalidDateIssue(ctx, "date", "Дата и время должны быть в будущем");
  }
});

export type CreateSessionFormValues = z.input<typeof createSessionSchema>;

export type UpdateSessionSchemaOptions = {
  hasActiveBookings: boolean;
  isPastSession?: boolean;
  currentStartsAt: Date;
  currentDurationMinutes: number;
  currentCapacity: number;
};

export function updateSessionSchema(options: UpdateSessionSchemaOptions) {
  return sessionBaseSchema.superRefine((value, ctx) => {
    const startsAt = createUtcDateFromMoscowDateTime(value.date, value.startTime);

    if (!startsAt) {
      addInvalidDateIssue(ctx, "date", "Введите корректные дату и время");
      return;
    }

    const startsAtChanged =
      startsAt.getTime() !== options.currentStartsAt.getTime();
    const durationChanged =
      value.durationMinutes !== options.currentDurationMinutes;
    const capacityReduced = value.capacity < options.currentCapacity;
    const capacityChanged = value.capacity !== options.currentCapacity;

    if (options.hasActiveBookings) {
      if (startsAtChanged) {
        addInvalidDateIssue(ctx, "date", "Нельзя изменить: уже есть записи");
      }

      if (durationChanged) {
        ctx.addIssue({
          code: "custom",
          path: ["durationMinutes"],
          message: "Нельзя изменить: уже есть записи",
        });
      }

      if (capacityReduced) {
        ctx.addIssue({
          code: "custom",
          path: ["capacity"],
          message: "Нельзя уменьшить вместимость: уже есть записи",
        });
      }

      return;
    }

    if (options.isPastSession) {
      if (startsAtChanged) {
        addInvalidDateIssue(ctx, "date", "Нельзя изменить дату и время прошедшего занятия");
      }

      if (durationChanged) {
        ctx.addIssue({
          code: "custom",
          path: ["durationMinutes"],
          message: "Нельзя изменить длительность прошедшего занятия",
        });
      }

      if (capacityChanged) {
        ctx.addIssue({
          code: "custom",
          path: ["capacity"],
          message: "Нельзя изменить вместимость прошедшего занятия",
        });
      }

      return;
    }

    if (startsAt <= new Date()) {
      addInvalidDateIssue(ctx, "date", "Нельзя переносить занятие в прошлое");
    }
  });
}
