import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  membership: {
    findFirst: vi.fn(),
  },
  session: {
    findMany: vi.fn(),
  },
  booking: {
    findFirst: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/prisma-read", () => ({
  withPrismaReadRetry: (operation: () => Promise<unknown>) => operation(),
}));

vi.mock("@/lib/datetime", () => ({
  getMoscowWeekRange: vi.fn((offset: number, now: Date) => ({
    start: now,
    end: new Date(now.getTime() + (offset + 1) * 7 * 24 * 60 * 60 * 1000),
  })),
}));

import {
  getClientMembershipSnapshot,
  getClientScheduleData,
} from "@/features/bookings/queries";

const now = new Date("2026-04-14T12:00:00.000Z");

describe("client booking membership queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not count future-starting active memberships as active", async () => {
    prismaMock.membership.findFirst.mockResolvedValue(null);

    await expect(getClientMembershipSnapshot("user-1", now)).resolves.toEqual({
      activeMembership: null,
      bookableMembership: null,
    });

    expect(prismaMock.membership.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-1",
          status: "active",
          startsAt: {
            lte: now,
          },
          endsAt: {
            gte: now,
          },
        }),
      }),
    );
  });

  it("keeps current active memberships bookable when visits remain", async () => {
    const membership = {
      id: "membership-1",
      visitsRemaining: 2,
      visitsTotal: 8,
      endsAt: new Date("2026-05-14T12:00:00.000Z"),
      plan: {
        name: "8 visits",
      },
    };

    prismaMock.membership.findFirst.mockResolvedValue(membership);

    await expect(getClientMembershipSnapshot("user-1", now)).resolves.toEqual({
      activeMembership: membership,
      bookableMembership: membership,
    });
  });

  it("does not expose a bookable membership before its start date", async () => {
    prismaMock.membership.findFirst.mockResolvedValue(null);
    prismaMock.session.findMany.mockResolvedValue([]);

    await expect(
      getClientScheduleData("user-1", "this-week", now),
    ).resolves.toMatchObject({
      bookableMembership: null,
      sessions: [],
    });

    expect(prismaMock.membership.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-1",
          status: "active",
          startsAt: {
            lte: now,
          },
          endsAt: {
            gte: now,
          },
          visitsRemaining: {
            gt: 0,
          },
        }),
      }),
    );
  });
});
