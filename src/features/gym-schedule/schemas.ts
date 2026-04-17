import { z } from "zod/v4";

export const gymWorkingHourSchema = z
  .object({
    weekday: z.number().int().min(1).max(7),
    isOpen: z.boolean(),
    opensAtMinutes: z.number().int().min(0).max(1439),
    closesAtMinutes: z.number().int().min(1).max(1440),
  })
  .superRefine((value, ctx) => {
    if (value.opensAtMinutes % 60 !== 0) {
      ctx.addIssue({
        code: "custom",
        path: ["opensAtMinutes"],
        message: "Время начала должно быть кратно часу",
      });
    }

    if (value.closesAtMinutes % 60 !== 0) {
      ctx.addIssue({
        code: "custom",
        path: ["closesAtMinutes"],
        message: "Время окончания должно быть кратно часу",
      });
    }

    if (value.isOpen && value.opensAtMinutes >= value.closesAtMinutes) {
      ctx.addIssue({
        code: "custom",
        path: ["closesAtMinutes"],
        message: "Окончание должно быть позже начала",
      });
    }
  });

export const gymScheduleSettingsSchema = z.object({
  freeSlotCapacity: z.coerce
    .number()
    .int("Введите целое число")
    .min(1, "Минимум 1 место")
    .max(20, "Максимум 20 мест"),
  freeSlotDurationMinutes: z.literal(60),
  workingHours: z
    .array(gymWorkingHourSchema)
    .length(7, "Нужно указать все дни недели"),
});

export type GymScheduleSettingsFormValues = z.input<
  typeof gymScheduleSettingsSchema
>;
