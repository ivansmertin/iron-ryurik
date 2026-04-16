import { describe, expect, it, vi } from "vitest";
import { issueMembershipWithDb } from "@/features/memberships/service";

describe("issueMembershipWithDb", () => {
  it("считает endsAt от startsAt и инициализирует visitsRemaining из плана", async () => {
    const db = {
      membershipPlan: {
        findFirst: vi.fn().mockResolvedValue({
          id: "plan-1",
          visits: 12,
          durationDays: 30,
          price: "3500.00",
        }),
      },
      membership: {
        create: vi.fn().mockResolvedValue({ id: "membership-1" }),
      },
    };

    await issueMembershipWithDb(
      db as never,
      "client-1",
      {
        planId: "plan-1",
        startsAt: "2026-04-14",
        isPaid: true,
        paidAmount: 3500,
        paidAt: "2026-04-14",
      },
    );

    expect(db.membership.create).toHaveBeenCalledWith({
      data: {
        userId: "client-1",
        planId: "plan-1",
        visitsRemaining: 12,
        visitsTotal: 12,
        startsAt: new Date("2026-04-13T21:00:00.000Z"),
        endsAt: new Date("2026-05-13T21:00:00.000Z"),
        status: "active",
        paidAt: new Date("2026-04-13T21:00:00.000Z"),
        paidAmount: "3500.00",
      },
    });
  });
});
