import { z } from "zod/v4";

export const loginSchema = z.object({
  email: z.email("Введите корректный email"),
  password: z.string().min(1, "Введите пароль"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    fullName: z.string().min(2, "Минимум 2 символа"),
    email: z.email("Введите корректный email"),
    password: z.string().min(8, "Минимум 8 символов"),
    passwordConfirm: z.string(),
    sport: z.enum(["running", "trail", "triathlon", "skiing", "other"]).optional(),
    acceptRules: z.literal(true, {
      error: "Необходимо согласиться с правилами",
    }),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Пароли не совпадают",
    path: ["passwordConfirm"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.email("Введите корректный email"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Минимум 8 символов"),
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Пароли не совпадают",
    path: ["passwordConfirm"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
