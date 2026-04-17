import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod/v4";

const postgresUrl = z
  .string()
  .min(1)
  .refine(
    (s) => s.startsWith("postgresql://") || s.startsWith("postgres://"),
    "Must be a postgres URL",
  );

export const env = createEnv({
  server: {
    DATABASE_URL: postgresUrl,
    DIRECT_URL: postgresUrl,
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    QR_SIGNING_SECRET: z.string().min(32),
    EMAIL_PROVIDER: z.enum(["gmail", "brevo"]).default("gmail"),
    EMAIL_FROM: z.string().min(1),
    GMAIL_USER: z.string().email().optional(),
    GMAIL_APP_PASSWORD: z.string().min(1).optional(),
    BREVO_API_KEY: z.string().optional(),
    VAPID_PRIVATE_KEY: z.string().min(1).optional(),
    VAPID_SUBJECT: z.string().min(1).optional(),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().min(1).optional(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    QR_SIGNING_SECRET: process.env.QR_SIGNING_SECRET,
    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
    EMAIL_FROM: process.env.EMAIL_FROM,
    GMAIL_USER: process.env.GMAIL_USER,
    GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD,
    BREVO_API_KEY: process.env.BREVO_API_KEY,
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
    VAPID_SUBJECT: process.env.VAPID_SUBJECT,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
