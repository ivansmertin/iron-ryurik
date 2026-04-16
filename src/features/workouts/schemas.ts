import { z } from "zod/v4";

const dateTimeLocalRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export const workoutLogSchema = z.object({
  performedAt: z
    .string()
    .min(1, "Укажите дату и время тренировки")
    .regex(dateTimeLocalRegex, "Введите корректные дату и время"),
  durationMin: z.coerce
    .number()
    .int("Введите целое число")
    .min(1, "Минимум 1 минута")
    .max(360, "Максимум 360 минут")
    .optional(),
  rpe: z.coerce
    .number()
    .int("Введите целое число")
    .min(1, "Минимум 1")
    .max(10, "Максимум 10")
    .optional(),
  notes: z.string().trim().max(4000, "Максимум 4000 символов").optional(),
  exerciseIds: z.array(z.string().uuid("Некорректное упражнение")).default([]),
});

export const exerciseCatalogSchema = z.object({
  name: z.string().trim().min(1, "Укажите название").max(200, "Максимум 200 символов"),
  category: z.enum([
    "strength_legs",
    "strength_upper",
    "strength_core",
    "plyometrics",
    "running_drills",
    "cardio",
    "mobility",
    "other",
  ]),
  equipment: z.enum([
    "barbell",
    "dumbbell",
    "kettlebell",
    "machine",
    "bodyweight",
    "treadmill",
    "bike",
    "rower",
    "other",
  ]),
  description: z
    .string()
    .trim()
    .max(2000, "Максимум 2000 символов")
    .optional()
    .default(""),
  videoUrl: z.url("Введите корректный URL").optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export type WorkoutLogFormValues = z.input<typeof workoutLogSchema>;
export type ExerciseCatalogFormValues = z.input<typeof exerciseCatalogSchema>;
export const exerciseSchema = exerciseCatalogSchema;
