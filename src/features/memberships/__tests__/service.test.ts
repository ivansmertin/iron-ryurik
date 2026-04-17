import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";
import { prisma } from "@/lib/prisma";
import { issueMembershipWithDb } from "../service";

vi.mock("@/lib/prisma", () => ({
  prisma: mockDeep<any>(),
}));

describe("Memberships Service", () => {
  beforeEach(() => {
    mockReset(prisma as any);
  });

  describe("issueMembershipWithDb", () => {
    const mockPlan = {
      id: "plan-1",
      visits: 10,
      durationDays: 30,
      price: "1000.00",
      isActive: true,
    };

    it("successfully creates a membership with correct dates", async () => {
      vi.mocked(prisma.membershipPlan.findFirst).mockResolvedValue(mockPlan as any);
      vi.mocked(prisma.membership.create).mockResolvedValue({ id: "membership-1" } as any);

      const input = {
        planId: "plan-1",
        startsAt: "2024-04-17",
        isPaid: true,
        paidAmount: 1000,
        paidAt: "2024-04-17",
      };

      await issueMembershipWithDb(prisma as any, "client-1", input);

      expect(prisma.membership.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "client-1",
          planId: "plan-1",
          visitsRemaining: 10,
          visitsTotal: 10,
          status: "active",
          paidAmount: "1000.00",
        }),
      });

      const callArgs = vi.mocked(prisma.membership.create).mock.calls[0][0];
      const startsAt = callArgs.data.startsAt;
      const endsAt = callArgs.data.endsAt;

      expect(startsAt).toBeInstanceOf(Date);
      expect(endsAt).toBeInstanceOf(Date);
      
      // 30 days difference
      const diffDays = (endsAt.getTime() - startsAt.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(30);
    });

    it("throws error if plan is not found or inactive", async () => {
      vi.mocked(prisma.membershipPlan.findFirst).mockResolvedValue(null);

      const input = {
        planId: "invalid",
        startsAt: "2024-04-17",
        isPaid: false,
      };

      await expect(
        issueMembershipWithDb(prisma as any, "client-1", input)
      ).rejects.toThrow("Активный план не найден");
    });

    it("handles unpaid memberships correctly", async () => {
      vi.mocked(prisma.membershipPlan.findFirst).mockResolvedValue(mockPlan as any);

      const input = {
        planId: "plan-1",
        startsAt: "2024-04-17",
        isPaid: false,
      };

      await issueMembershipWithDb(prisma as any, "client-1", input);

      expect(prisma.membership.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          paidAt: null,
          paidAmount: null,
        }),
      });
    });
  });
});
