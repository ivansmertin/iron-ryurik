import { z } from "zod/v4";
import { createUtcDateFromMoscowDateTime } from "@/lib/datetime";

const trainerSlotBaseSchema = z.object({
  title: z
    .string()
    .trim()
    .max(200, "Максимум 200 символов")
    .optional()
    .default(""),
  description: z
    .string()
    .trim()
    .max(1000, "Максимум 1000 символов")
    .optional()
    .default(""),
  date: z.string().min(1, "Укажите дату"),
  startTime: z.string().min(1, "Укажите время начала"),
  durationMinutes: z
    .coerce.number()
    .int("Введите целое число")
    .min(15, "Минимум 15 минут")
    .max(240, "Максимум 240 минут")
    .refine((value) => value % 5 === 0, "Длительность должна быть кратна 5 минутам"),
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

export const trainerSlotSchema = trainerSlotBaseSchema.superRefine((value, ctx) => {
  const startsAt = createUtcDateFromMoscowDateTime(value.date, value.startTime);

  if (!startsAt) {
    addInvalidDateIssue(ctx, "date", "Введите корректные дату и время");
    return;
  }

  if (startsAt <= new Date()) {
    addInvalidDateIssue(ctx, "date", "Дата и время должны быть в будущем");
  }
});

export type TrainerSlotFormValues = z.input<typeof trainerSlotSchema>;
