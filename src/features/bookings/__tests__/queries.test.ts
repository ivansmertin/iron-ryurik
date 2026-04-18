import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  membership: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
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
      _count: {
        bookings: 1,
      },
    };

    prismaMock.membership.findFirst.mockResolvedValue(membership);

    const expectedMembership = {
      id: "membership-1",
      visitsRemaining: 2,
      visitsTotal: 8,
      reservedSessions: 1,
      availableSessions: 1,
      endsAt: new Date("2026-05-14T12:00:00.000Z"),
      plan: {
        name: "8 visits",
      },
    };

    await expect(getClientMembershipSnapshot("user-1", now)).resolves.toEqual({
      activeMembership: expectedMembership,
      bookableMembership: expectedMembership,
    });
  });

  it("does not expose a bookable membership before its start date", async () => {
    prismaMock.membership.findFirst.mockResolvedValue(null);
    prismaMock.membership.findMany.mockResolvedValue([]);
    prismaMock.session.findMany.mockResolvedValue([]);

    await expect(
      getClientScheduleData("user-1", "this-week", now),
    ).resolves.toMatchObject({
      bookableMembership: null,
      sessions: [],
    });

    expect(prismaMock.membership.findMany).toHaveBeenCalledWith(
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

  it("includes auto_free sessions in the client schedule (filter is type=group, not origin)", async () => {
    prismaMock.membership.findMany.mockResolvedValue([]);
    prismaMock.session.findMany.mockResolvedValue([
      {
        id: "manual-1",
        origin: "manual",
        title: "Manual group",
        description: null,
        startsAt: new Date("2026-04-18T11:30:00.000Z"),
        durationMinutes: 60,
        capacity: 4,
        dropInEnabled: false,
        dropInPrice: null,
        bookings: [],
      },
      {
        id: "free-1",
        origin: "auto_free",
        title: "Free slot",
        description: null,
        startsAt: new Date("2026-04-20T09:00:00.000Z"),
        durationMinutes: 60,
        capacity: 8,
        dropInEnabled: true,
        dropInPrice: null,
        bookings: [],
      },
    ]);

    const result = await getClientScheduleData("user-1", "this-week", now);

    expect(result.sessions.map((session) => session.id)).toEqual([
      "manual-1",
      "free-1",
    ]);

    const whereArg = prismaMock.session.findMany.mock.calls[0]?.[0];
    expect(whereArg.where).not.toHaveProperty("origin");
    expect(whereArg.where.type).toBe("group");
    expect(whereArg.where.status).toBe("scheduled");
  });

  it("treats legacy auto_free rows as drop-in enabled in fallback", async () => {
    prismaMock.membership.findMany.mockResolvedValue([]);
    prismaMock.session.findMany
      .mockRejectedValueOnce({
        code: "P2022",
        meta: { modelName: "Session" },
        message: "The column `Session.dropInEnabled` does not exist",
      })
      .mockResolvedValueOnce([
        {
          id: "session-1",
          origin: "auto_free",
          title: "Legacy free slot",
          description: "Legacy schema row",
          startsAt: new Date("2026-04-15T10:00:00.000Z"),
          durationMinutes: 60,
          capacity: 12,
          bookings: [{ userId: "user-2" }],
        },
      ]);

    const result = await getClientScheduleData("user-1", "this-week", now);

    expect(prismaMock.session.findMany).toHaveBeenCalledTimes(2);
    expect(result.sessions).toEqual([
      {
        id: "session-1",
        origin: "auto_free",
        title: "Legacy free slot",
        description: "Legacy schema row",
        startsAt: new Date("2026-04-15T10:00:00.000Z"),
        durationMinutes: 60,
        capacity: 12,
        dropInEnabled: true,
        dropInPrice: null,
        bookings: [{ userId: "user-2" }],
      },
    ]);
  });
});
