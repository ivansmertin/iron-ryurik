import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  issueMembershipWithDb,
  DUPLICATE_ACTIVE_MEMBERSHIP_INDEX,
  DUPLICATE_ACTIVE_MEMBERSHIP_MESSAGE,
} from "../service";

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

    it("translates P2002 on the active-membership index to a domain error", async () => {
      vi.mocked(prisma.membershipPlan.findFirst).mockResolvedValue(mockPlan as any);
      const duplicate = new Prisma.PrismaClientKnownRequestError(
        "Unique constraint failed",
        {
          code: "P2002",
          clientVersion: "7.0.0",
          meta: { target: [DUPLICATE_ACTIVE_MEMBERSHIP_INDEX] },
        },
      );
      vi.mocked(prisma.membership.create).mockRejectedValue(duplicate);

      await expect(
        issueMembershipWithDb(prisma as any, "client-1", {
          planId: "plan-1",
          startsAt: "2024-04-17",
          isPaid: false,
        }),
      ).rejects.toThrow(DUPLICATE_ACTIVE_MEMBERSHIP_MESSAGE);
    });

    it("rethrows unrelated Prisma errors untouched", async () => {
      vi.mocked(prisma.membershipPlan.findFirst).mockResolvedValue(mockPlan as any);
      const unrelated = new Prisma.PrismaClientKnownRequestError("boom", {
        code: "P2002",
        clientVersion: "7.0.0",
        meta: { target: ["Membership_something_else_key"] },
      });
      vi.mocked(prisma.membership.create).mockRejectedValue(unrelated);

      await expect(
        issueMembershipWithDb(prisma as any, "client-1", {
          planId: "plan-1",
          startsAt: "2024-04-17",
          isPaid: false,
        }),
      ).rejects.toBe(unrelated);
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
