import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

process.env.SKIP_ENV_VALIDATION = "true";
process.env.DATABASE_URL = "postgresql://mock:mock@localhost:5432/mock";
process.env.DIRECT_URL = "postgresql://mock:mock@localhost:5432/mock";
process.env.QR_SIGNING_SECRET = "01234567890123456789012345678901";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "mock";
process.env.EMAIL_FROM = "test@example.com";
