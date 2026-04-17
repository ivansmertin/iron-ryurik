import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";
import { prisma } from "@/lib/prisma";
import { requireUser, requireUserRole } from "@/features/auth/get-user";
import {
  cancelBooking,
  confirmAttendance,
  confirmAttendanceFromQr,
  markBookingNoShow,
} from "../actions";
import {
  BookingServiceError,
  confirmAttendanceForBooking,
  markNoShowForBooking,
  type AttendanceResult,
} from "../service";
import { updateGymOccupancy } from "@/features/gym-state/service";
import { createBookingQrToken } from "../qr";

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

vi.mock("../service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../service")>();
  return {
    ...actual,
    confirmAttendanceForBooking: vi.fn(),
    markNoShowForBooking: vi.fn(),
  };
});

vi.mock("@/features/gym-state/service", () => ({
  updateGymOccupancy: vi.fn(),
}));

const mockPrisma = prisma as unknown as ReturnType<typeof mockDeep<import("@prisma/client").PrismaClient>>;
const mockRequireUser = requireUser as unknown as any;
const mockRequireUserRole = requireUserRole as unknown as any;
const mockConfirmAttendanceForBooking = confirmAttendanceForBooking as unknown as any;
const mockMarkNoShowForBooking = markNoShowForBooking as unknown as any;
const mockUpdateGymOccupancy = updateGymOccupancy as unknown as any;

function buildAttendanceResult(overrides: Partial<AttendanceResult> = {}): AttendanceResult {
  return {
    bookingId: "booking-1",
    sessionId: "session-1",
    sessionTitle: "Yoga",
    startsAt: new Date("2026-04-14T13:00:00.000Z"),
    durationMinutes: 60,
    clientFullName: "Test User",
    clientEmail: "test@example.com",
    status: "completed",
    alreadyProcessed: false,
    visitsRemaining: 9,
    ...overrides,
  } as AttendanceResult;
}

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

  describe("confirmAttendance (manual)", () => {
    it("increments gym occupancy by 1 on successful fresh confirmation", async () => {
      mockRequireUserRole.mockResolvedValue({ id: "trainer-1", role: "trainer" });
      mockConfirmAttendanceForBooking.mockResolvedValue(
        buildAttendanceResult({ alreadyProcessed: false, status: "completed" }),
      );

      await confirmAttendance("booking-1");

      expect(mockUpdateGymOccupancy).toHaveBeenCalledTimes(1);
      expect(mockUpdateGymOccupancy).toHaveBeenCalledWith({ delta: 1 });
    });

    it("does NOT increment gym occupancy when booking was already processed", async () => {
      mockRequireUserRole.mockResolvedValue({ id: "admin-1", role: "admin" });
      mockConfirmAttendanceForBooking.mockResolvedValue(
        buildAttendanceResult({ alreadyProcessed: true, status: "completed" }),
      );

      await confirmAttendance("booking-1");

      expect(mockUpdateGymOccupancy).not.toHaveBeenCalled();
    });

    it("swallows errors from updateGymOccupancy and still returns success", async () => {
      mockRequireUserRole.mockResolvedValue({ id: "admin-1", role: "admin" });
      mockConfirmAttendanceForBooking.mockResolvedValue(
        buildAttendanceResult({ alreadyProcessed: false }),
      );
      mockUpdateGymOccupancy.mockRejectedValue(new Error("db down"));
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await confirmAttendance("booking-1");

      expect(result).toMatchObject({ ok: true, status: "completed" });
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("confirmAttendanceFromQr", () => {
    it("increments gym occupancy by 1 on successful fresh QR confirmation", async () => {
      const userId = "user-1";
      const bookingId = "booking-1";
      const sessionId = "session-1";
      mockRequireUserRole.mockResolvedValue({ id: "trainer-1", role: "trainer" });
      mockPrisma.booking.findUnique.mockResolvedValue({
        userId,
        sessionId,
      } as any);
      mockConfirmAttendanceForBooking.mockResolvedValue(
        buildAttendanceResult({
          bookingId,
          sessionId,
          alreadyProcessed: false,
          status: "completed",
        }),
      );

      const token = createBookingQrToken({ bookingId, userId, sessionId, now });

      await confirmAttendanceFromQr(token);

      expect(mockUpdateGymOccupancy).toHaveBeenCalledTimes(1);
      expect(mockUpdateGymOccupancy).toHaveBeenCalledWith({ delta: 1 });
    });

    it("does NOT increment occupancy when QR scan is a duplicate (alreadyProcessed)", async () => {
      const userId = "user-1";
      const bookingId = "booking-1";
      const sessionId = "session-1";
      mockRequireUserRole.mockResolvedValue({ id: "admin-1", role: "admin" });
      mockPrisma.booking.findUnique.mockResolvedValue({
        userId,
        sessionId,
      } as any);
      mockConfirmAttendanceForBooking.mockResolvedValue(
        buildAttendanceResult({
          bookingId,
          sessionId,
          alreadyProcessed: true,
          status: "completed",
        }),
      );

      const token = createBookingQrToken({ bookingId, userId, sessionId, now });

      await confirmAttendanceFromQr(token);

      expect(mockUpdateGymOccupancy).not.toHaveBeenCalled();
    });
  });

  describe("markBookingNoShow", () => {
    it("never increments gym occupancy", async () => {
      mockRequireUserRole.mockResolvedValue({ id: "admin-1", role: "admin" });
      mockMarkNoShowForBooking.mockResolvedValue(
        buildAttendanceResult({ status: "no_show", alreadyProcessed: false }),
      );

      await markBookingNoShow("booking-1");

      expect(mockUpdateGymOccupancy).not.toHaveBeenCalled();
    });
  });
});
