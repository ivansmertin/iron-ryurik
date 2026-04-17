import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/features/auth/get-user";
import { redirect } from "next/navigation";
import {
  createMembershipPlan,
  deleteMembershipPlan,
  issueMembership,
  purchaseMembershipClient,
} from "../actions";
import { issueMembershipWithDb } from "../service";

vi.mock("@/lib/prisma", () => ({
  prisma: mockDeep<any>(),
}));

vi.mock("@/features/auth/get-user", () => ({
  requireUser: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("../service", () => ({
  issueMembershipWithDb: vi.fn(),
}));

describe("Memberships Actions", () => {
  beforeEach(() => {
    mockReset(prisma as any);
    vi.clearAllMocks();
    
    // Default transaction implementation
    (prisma.$transaction as any).mockImplementation(async (cb: any) => {
      return cb(prisma);
    });
  });

  const mockAdmin = { id: "admin-1", role: "admin" };
  const mockClient = { id: "client-1", role: "client" };
  const mockTrainer = { id: "trainer-1", role: "trainer" };

  describe("createMembershipPlan", () => {
    it("successfully creates a plan as admin", async () => {
      vi.mocked(requireUser).mockResolvedValue(mockAdmin as any);
      
      const formData = new FormData();
      formData.append("name", "Standard");
      formData.append("visits", "8");
      formData.append("durationDays", "30");
      formData.append("price", "5000");
      formData.append("isActive", "on");

      await createMembershipPlan({}, formData);

      expect(prisma.membershipPlan.create).toHaveBeenCalledWith({
        data: {
          name: "Standard",
          visits: 8,
          durationDays: 30,
          price: "5000.00",
          isActive: true,
        },
      });
      expect(redirect).toHaveBeenCalledWith(expect.stringContaining("plan-created"));
    });

    it("fails if user is not admin", async () => {
      vi.mocked(requireUser).mockRejectedValue(new Error("Unauthorized"));
      
      const formData = new FormData();
      await expect(createMembershipPlan({}, formData)).rejects.toThrow("Unauthorized");
    });

    it("returns field errors if validation fails", async () => {
      vi.mocked(requireUser).mockResolvedValue(mockAdmin as any);
      
      const formData = new FormData();
      // Empty fields
      
      const result = await createMembershipPlan({}, formData);
      expect(result.fieldErrors).toBeDefined();
      expect(prisma.membershipPlan.create).not.toHaveBeenCalled();
    });
  });

  describe("deleteMembershipPlan", () => {
    it("successfully deletes plan if no memberships exist", async () => {
      vi.mocked(requireUser).mockResolvedValue(mockAdmin as any);
      const planId = "plan-1";
      
      vi.mocked(prisma.membershipPlan.findUnique).mockResolvedValue({
        id: planId,
        _count: { memberships: 0 }
      } as any);

      await deleteMembershipPlan(planId);

      expect(prisma.membershipPlan.delete).toHaveBeenCalledWith({
        where: { id: planId }
      });
      expect(redirect).toHaveBeenCalledWith(expect.stringContaining("plan-deleted"));
    });

    it("returns error if plan has memberships", async () => {
      vi.mocked(requireUser).mockResolvedValue(mockAdmin as any);
      const planId = "plan-1";
      
      vi.mocked(prisma.membershipPlan.findUnique).mockResolvedValue({
        id: planId,
        _count: { memberships: 5 }
      } as any);

      const result = await deleteMembershipPlan(planId);
      expect(result.error).toContain("Нельзя удалить план");
      expect(prisma.membershipPlan.delete).not.toHaveBeenCalled();
    });
  });

  describe("issueMembership", () => {
    it("successfully issues membership to client", async () => {
      vi.mocked(requireUser).mockResolvedValue(mockAdmin as any);
      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockClient as any);
      
      const formData = new FormData();
      formData.append("planId", "00000000-0000-0000-0000-000000000000");
      formData.append("startsAt", "2024-04-17");
      formData.append("isPaid", "on");
      formData.append("paidAmount", "5000");
      formData.append("paidAt", "2024-04-17");

      await issueMembership(mockClient.id, {}, formData);

      expect(issueMembershipWithDb).toHaveBeenCalled();
      expect(redirect).toHaveBeenCalledWith(expect.stringContaining("membership-issued"));
    });
  });

  describe("purchaseMembershipClient", () => {
    it("successfully purchases membership as client", async () => {
      vi.mocked(requireUser).mockResolvedValue(mockClient as any);
      const planId = "plan-1";

      await purchaseMembershipClient(planId);

      expect(issueMembershipWithDb).toHaveBeenCalledWith(
        expect.anything(),
        mockClient.id,
        expect.objectContaining({
          planId,
          isPaid: false
        })
      );
      expect(redirect).toHaveBeenCalledWith(expect.stringContaining("membership-purchased"));
    });
  });
});
