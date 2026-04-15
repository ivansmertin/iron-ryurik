import { z } from "zod/v4";
import type { Sport } from "@prisma/client";

export const updateClientProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Укажите имя")
    .max(200, "Максимум 200 символов"),
  phone: z
    .string()
    .trim()
    .max(30, "Максимум 30 символов")
    .optional()
    .default(""),
  sport: z.union([
    z.literal(""),
    z.enum(["running", "trail", "triathlon", "skiing", "other"]),
  ]),
});

export type UpdateClientProfileFormValues = z.input<
  typeof updateClientProfileSchema
>;

export function normalizeSportValue(value: string): Sport | null {
  if (!value) {
    return null;
  }

  if (
    value === "running" ||
    value === "trail" ||
    value === "triathlon" ||
    value === "skiing" ||
    value === "other"
  ) {
    return value;
  }

  return null;
}
