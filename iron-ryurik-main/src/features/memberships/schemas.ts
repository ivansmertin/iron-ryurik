import { z } from "zod/v4";
import { createUtcDateFromMoscowDate } from "@/lib/datetime";

export const membershipPlanSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Укажите название плана")
    .max(120, "Максимум 120 символов"),
  visits: z.coerce
    .number()
    .int("Введите целое число")
    .min(1, "Минимум 1 занятие")
    .max(100, "Максимум 100 занятий"),
  durationDays: z.coerce
    .number()
    .int("Введите целое число")
    .min(1, "Минимум 1 день")
    .max(365, "Максимум 365 дней"),
  price: z.coerce.number().min(0, "Цена не может быть отрицательной"),
  isActive: z.boolean(),
});

export type MembershipPlanFormValues = z.input<typeof membershipPlanSchema>;

export const issueMembershipSchema = z
  .object({
    planId: z.uuid("Выберите план"),
    startsAt: z.string().min(1, "Укажите дату начала"),
    isPaid: z.boolean(),
    paidAmount: z
      .union([z.literal(""), z.coerce.number().min(0, "Сумма не может быть отрицательной")])
      .optional()
      .default(""),
    paidAt: z.string().optional().default(""),
  })
  .superRefine((value, ctx) => {
    const startsAt = createUtcDateFromMoscowDate(value.startsAt);

    if (!startsAt) {
      ctx.addIssue({
        code: "custom",
        path: ["startsAt"],
        message: "Укажите корректную дату начала",
      });
    }

    if (!value.isPaid) {
      return;
    }

    if (value.paidAmount === "" || value.paidAmount === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["paidAmount"],
        message: "Укажите сумму оплаты",
      });
    }

    if (!value.paidAt) {
      ctx.addIssue({
        code: "custom",
        path: ["paidAt"],
        message: "Укажите дату оплаты",
      });
      return;
    }

    if (!createUtcDateFromMoscowDate(value.paidAt)) {
      ctx.addIssue({
        code: "custom",
        path: ["paidAt"],
        message: "Укажите корректную дату оплаты",
      });
    }
  });

export type IssueMembershipFormValues = z.input<typeof issueMembershipSchema>;
