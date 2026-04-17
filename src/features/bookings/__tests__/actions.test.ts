import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/features/auth/get-user";
import { cancelBooking } from "../actions";
import { BookingServiceError } from "../service";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  prisma: mockDeep<import("@prisma/client").PrismaClient>(),
}));

vi.mock("@/features/auth/get-user", () => ({
  requireUser: vi.fn(),
  requireUserRole: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/email/notifications", () => ({
  sendBestEffortEmails: vi.fn(),
  sendBookingCancellationEmail: vi.fn(),
  sendBookingConfirmationEmail: vi.fn(),
}));

const mockPrisma = prisma as unknown as ReturnType<typeof mockDeep<import("@prisma/client").PrismaClient>>;
const mockRequireUser = requireUser as unknown as any;

describe("Booking Server Actions", () => {
  const now = new Date("2026-04-14T12:00:00.000Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    mockReset(mockPrisma);
    vi.clearAllMocks();

    // Default mock for $transaction
    mockPrisma.$transaction.mockImplementation(async (callback: any) => {
      return callback(mockPrisma);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("cancelBooking", () => {
    it("successfully cancels a booking when user is the owner", async () => {
      const userId = "user-1";
      const bookingId = "booking-1";
      const sessionId = "session-1";

      mockRequireUser.mockResolvedValue({ id: userId, email: "test@example.com", fullName: "Test User" });

      // Mock Booking data for service logic
      mockPrisma.booking.findFirst.mockResolvedValue({
        id: bookingId,
        userId: userId,
        sessionId: sessionId,
        membershipId: "membership-1",
        status: "pending",
      } as any);

      // Mock $queryRaw for locking logic in service
      // Service calls $queryRaw twice: once for locking booking, once for locking session
      mockPrisma.$queryRaw.mockResolvedValueOnce([
        { id: bookingId, userId, sessionId, membershipId: "membership-1", status: "pending" }
      ]).mockResolvedValueOnce([
        { id: sessionId, title: "Yoga", startsAt: new Date("2026-04-15T12:00:00.000Z"), durationMinutes: 60, cancellationDeadlineHours: 2 }
      ]);

      mockPrisma.booking.update.mockResolvedValue({ id: bookingId } as any);

      const result = await cancelBooking(bookingId, undefined, new FormData());

      expect(result).toMatchObject({
        ok: true,
        bookingId,
      });
      expect(mockPrisma.booking.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: bookingId },
        data: expect.objectContaining({ status: "cancelled" }),
      }));
    });

    it("returns error state when service throws BookingServiceError (e.g. Forbidden)", async () => {
      const userId = "user-1";
      const bookingId = "booking-1";

      mockRequireUser.mockResolvedValue({ id: userId });

      // Mock service logic to throw Forbidden (different user)
      // Service calls lockBooking -> $queryRaw
      mockPrisma.$queryRaw.mockResolvedValueOnce([
        { id: bookingId, userId: "other-user", sessionId: "s1", status: "pending" }
      ]);

      const result = await cancelBooking(bookingId, undefined, new FormData());

      expect(result).toMatchObject({
        ok: false,
        code: "FORBIDDEN",
      });
    });

    it("requires 'client' role by calling requireUser('client')", async () => {
      const bookingId = "booking-1";
      
      await cancelBooking(bookingId, undefined, new FormData());
      
      expect(mockRequireUser).toHaveBeenCalledWith("client");
    });
  });
});
