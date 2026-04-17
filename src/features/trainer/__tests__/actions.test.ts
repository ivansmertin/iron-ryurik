import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/features/auth/get-user";
import { 
  createTrainerSlot, 
  cancelTrainerSlot, 
  claimFreeSlot,
  updateTrainerClientNotes 
} from "../actions";
import { redirect } from "next/navigation";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  prisma: mockDeep<import("@prisma/client").PrismaClient>(),
}));

vi.mock("@/features/auth/get-user", () => ({
  requireUser: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/features/sessions/service", () => ({
  cancelSessionWithDb: vi.fn(),
}));

const mockPrisma = prisma as unknown as ReturnType<typeof mockDeep<import("@prisma/client").PrismaClient>>;
const mockRequireUser = requireUser as unknown as any;
const { cancelSessionWithDb } = await import("@/features/sessions/service");
const mockCancelSessionWithDb = cancelSessionWithDb as unknown as any;

describe("Trainer Server Actions", () => {
  const now = new Date("2026-04-17T12:00:00.000Z");
  const trainerId = "trainer-1";
  const mockTrainer = { id: trainerId, role: "trainer", email: "trainer@example.com" };

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

  describe("createTrainerSlot", () => {
    const validFormData = new FormData();
    validFormData.append("title", "Test Slot");
    validFormData.append("date", "2026-04-18");
    validFormData.append("startTime", "10:00");
    validFormData.append("durationMinutes", "60");

    it("successfully creates a new personal slot when no free slot exists", async () => {
      mockRequireUser.mockResolvedValue(mockTrainer);
      mockPrisma.session.findFirst.mockResolvedValue(null); // No existing free slot

      await createTrainerSlot({}, validFormData);

      expect(mockPrisma.session.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: "personal",
          trainerId: trainerId,
          title: "Test Slot",
          durationMinutes: 60,
          capacity: 1,
        }),
      });
      expect(redirect).toHaveBeenCalledWith(expect.stringContaining("session-created"));
    });

    it("updates existing auto_free slot instead of creating a new one", async () => {
      mockRequireUser.mockResolvedValue(mockTrainer);
      const existingSlot = { 
        id: "free-slot-1", 
        capacity: 1, 
        durationMinutes: 45,
        bookings: [] 
      };
      mockPrisma.session.findFirst.mockResolvedValue(existingSlot as any);

      await createTrainerSlot({}, validFormData);

      expect(mockPrisma.session.update).toHaveBeenCalledWith({
        where: { id: "free-slot-1" },
        data: expect.objectContaining({
          trainerId: trainerId,
          origin: "manual",
          title: "Test Slot",
        }),
      });
      expect(mockPrisma.session.create).not.toHaveBeenCalled();
      expect(redirect).toHaveBeenCalledWith(expect.stringContaining("session-created"));
    });

    it("fails when user is a client", async () => {
      // requireUser handles the error if role is wrong, but we can mock it to throw 
      // or return null/error if the action logic relies on it.
      // In our code, requireUser("trainer") throws or redirects if not authorized.
      mockRequireUser.mockImplementation(() => {
        throw new Error("Unauthorized");
      });

      await expect(createTrainerSlot({}, validFormData)).rejects.toThrow("Unauthorized");
    });
  });

  describe("cancelTrainerSlot", () => {
    it("successfully cancels own slot", async () => {
      mockRequireUser.mockResolvedValue(mockTrainer);
      mockPrisma.session.findFirst.mockResolvedValue({
        id: "slot-1",
        trainerId: trainerId,
        status: "scheduled"
      } as any);

      mockCancelSessionWithDb.mockResolvedValue({
        cancelledBookingsCount: 0,
        session: { id: "slot-1" }
      });

      await cancelTrainerSlot("slot-1");

      expect(mockCancelSessionWithDb).toHaveBeenCalled();
      expect(redirect).toHaveBeenCalledWith(expect.stringContaining("session-cancelled"));
    });

    it("returns error if slot not found or not owned", async () => {
      mockRequireUser.mockResolvedValue(mockTrainer);
      mockPrisma.session.findFirst.mockResolvedValue(null);

      const result = await cancelTrainerSlot("other-slot");

      expect(result).toMatchObject({ ok: false, error: "Слот не найден." });
    });

    it("returns error if slot is already cancelled", async () => {
      mockRequireUser.mockResolvedValue(mockTrainer);
      mockPrisma.session.findFirst.mockResolvedValue({
        id: "slot-1",
        trainerId: trainerId,
        status: "cancelled"
      } as any);

      const result = await cancelTrainerSlot("slot-1");

      expect(result).toMatchObject({ ok: false, error: "Слот больше нельзя отменить." });
    });
  });

  describe("claimFreeSlot", () => {
    it("successfully claims an auto_free slot", async () => {
      mockRequireUser.mockResolvedValue(mockTrainer);
      mockPrisma.session.findFirst.mockResolvedValue({ id: "free-1", version: 1 } as any);

      await claimFreeSlot("free-1");

      expect(mockPrisma.session.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: "free-1", version: 1 },
        data: expect.objectContaining({
          trainerId: trainerId,
          origin: "manual"
        })
      }));
      expect(redirect).toHaveBeenCalledWith(expect.stringContaining("slot-claimed"));
    });

    it("returns error if slot is not found/not claimable", async () => {
      mockRequireUser.mockResolvedValue(mockTrainer);
      mockPrisma.session.findFirst.mockResolvedValue(null);

      const result = await claimFreeSlot("invalid-1");

      expect(result).toMatchObject({ ok: false, error: "Слот не найден или уже занят другим тренером." });
    });
  });

  describe("updateTrainerClientNotes", () => {
    it("successfully updates notes for a linked client", async () => {
      mockRequireUser.mockResolvedValue(mockTrainer);
      const clientId = "client-1";
      mockPrisma.user.findFirst.mockResolvedValue({ id: clientId } as any);

      const formData = new FormData();
      formData.append("notes", "He is doing well.");

      await updateTrainerClientNotes(clientId, {}, formData);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: clientId },
        data: { notes: "He is doing well." }
      });
      expect(redirect).toHaveBeenCalledWith(expect.stringContaining("notes-updated"));
    });

    it("returns error if client is not linked to trainer", async () => {
      mockRequireUser.mockResolvedValue(mockTrainer);
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const result = await updateTrainerClientNotes("other-client", {}, new FormData());

      expect(result).toMatchObject({ ok: false, error: "Клиент не найден." });
    });
  });
});
