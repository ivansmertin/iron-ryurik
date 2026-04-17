import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  session: {
    count: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
  user: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/prisma-read", () => ({
  withPrismaReadRetry: (operation: () => Promise<unknown>) => operation(),
}));

import { getSessionById, listSessions } from "@/features/sessions/queries";

describe("sessions queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("falls back to legacy schema in listSessions", async () => {
    prismaMock.session.count.mockResolvedValue(1);
    prismaMock.session.findMany
      .mockRejectedValueOnce({
        code: "P2022",
        meta: { modelName: "Session" },
        message: "The column `Session.dropInEnabled` does not exist",
      })
      .mockResolvedValueOnce([
        {
          id: "session-1",
          title: "Morning Group",
          origin: "manual",
          autoSlotKey: null,
          startsAt: new Date("2026-04-20T07:00:00.000Z"),
          durationMinutes: 60,
          capacity: 10,
          cancellationDeadlineHours: 2,
          status: "scheduled",
          trainer: {
            id: "trainer-1",
            fullName: "Trainer",
          },
          bookings: [],
        },
      ]);

    const result = await listSessions({
      page: 1,
      pageSize: 20,
      tab: "upcoming",
    });

    expect(result.items).toEqual([
      {
        id: "session-1",
        title: "Morning Group",
        origin: "manual",
        autoSlotKey: null,
        startsAt: new Date("2026-04-20T07:00:00.000Z"),
        durationMinutes: 60,
        capacity: 10,
        cancellationDeadlineHours: 2,
        status: "scheduled",
        trainer: {
          id: "trainer-1",
          fullName: "Trainer",
        },
        bookings: [],
        dropInEnabled: false,
        dropInPrice: null,
      },
    ]);
  });

  it("falls back to legacy schema in getSessionById", async () => {
    prismaMock.session.findFirst
      .mockRejectedValueOnce({
        code: "P2022",
        meta: { modelName: "Session" },
        message: "The column `Session.dropInPrice` does not exist",
      })
      .mockResolvedValueOnce({
        id: "session-2",
        title: "Evening Group",
        description: null,
        trainerId: "trainer-1",
        origin: "manual",
        autoSlotKey: null,
        startsAt: new Date("2026-04-21T17:00:00.000Z"),
        durationMinutes: 90,
        capacity: 12,
        cancellationDeadlineHours: 2,
        status: "scheduled",
        version: 1,
        bookings: [{ id: "booking-1" }],
      });

    const result = await getSessionById("session-2");

    expect(result).toEqual({
      id: "session-2",
      title: "Evening Group",
      description: null,
      trainerId: "trainer-1",
      origin: "manual",
      autoSlotKey: null,
      startsAt: new Date("2026-04-21T17:00:00.000Z"),
      durationMinutes: 90,
      capacity: 12,
      cancellationDeadlineHours: 2,
      status: "scheduled",
      version: 1,
      bookings: [{ id: "booking-1" }],
      dropInEnabled: false,
      dropInPrice: null,
    });
  });
});
