import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const now = new Date("2026-04-14T12:00:00.000Z");

async function loadQrModule() {
  vi.resetModules();
  vi.stubEnv("DATABASE_URL", "postgresql://user:password@localhost:5432/postgres");
  vi.stubEnv("DIRECT_URL", "postgresql://user:password@localhost:5432/postgres");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
  vi.stubEnv("QR_SIGNING_SECRET", "test-qr-signing-secret-with-32-chars");
  vi.stubEnv("EMAIL_FROM", "Iron Rurik <test@example.com>");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");

  return import("@/features/bookings/qr");
}

describe("booking QR tokens", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("creates and verifies a signed token", async () => {
    const { createBookingQrToken, verifyBookingQrToken } = await loadQrModule();

    const token = createBookingQrToken({
      bookingId: "booking-1",
      userId: "user-1",
      sessionId: "session-1",
      now,
    });

    expect(verifyBookingQrToken(token, now)).toMatchObject({
      bookingId: "booking-1",
      userId: "user-1",
      sessionId: "session-1",
    });
  });

  it("rejects a tampered token", async () => {
    const { createBookingQrToken, verifyBookingQrToken } = await loadQrModule();
    const payload = JSON.parse(
      createBookingQrToken({
        bookingId: "booking-1",
        userId: "user-1",
        sessionId: "session-1",
        now,
      }),
    ) as Record<string, unknown>;

    payload.bookingId = "booking-2";

    expect(() =>
      verifyBookingQrToken(JSON.stringify(payload), now),
    ).toThrowError(/QR-код/);
  });

  it("rejects an expired token", async () => {
    const { createBookingQrToken, verifyBookingQrToken } = await loadQrModule();
    const token = createBookingQrToken({
      bookingId: "booking-1",
      userId: "user-1",
      sessionId: "session-1",
      now,
    });

    expect(() =>
      verifyBookingQrToken(token, new Date(now.getTime() + 11 * 60 * 1000)),
    ).toThrowError(/QR-код/);
  });
});
