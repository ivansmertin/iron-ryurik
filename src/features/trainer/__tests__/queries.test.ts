import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  session: {
    count: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
  user: {
    count: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
  program: {
    count: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/prisma-read", () => ({
  withPrismaReadRetry: (operation: () => Promise<unknown>) => operation(),
}));

import {
  getTrainerClientById,
  getTrainerSlotById,
  listTrainerClients,
} from "@/features/trainer/queries";

describe("trainer queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listTrainerClients фильтрует только клиентов текущего тренера и ищет по Program", async () => {
    prismaMock.user.count.mockResolvedValue(1);
    prismaMock.user.findMany.mockResolvedValue([
      {
        id: "client-1",
        fullName: "Анна Иванова",
        email: "anna@example.com",
        phone: null,
        sport: "running",
        createdAt: new Date("2026-04-10T10:00:00.000Z"),
        notes: null,
        programs: [
          {
            id: "program-1",
            name: "Подготовка к старту",
            startsAt: new Date("2026-04-01T10:00:00.000Z"),
            endsAt: null,
          },
        ],
      },
    ]);

    const result = await listTrainerClients({
      trainerId: "trainer-1",
      page: 2,
      pageSize: 10,
      query: " Анна ",
    });

    expect(prismaMock.user.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          role: "client",
          deletedAt: null,
          programs: {
            some: {
              trainerId: "trainer-1",
            },
          },
          OR: [
            {
              fullName: {
                contains: "Анна",
                mode: "insensitive",
              },
            },
            {
              email: {
                contains: "Анна",
                mode: "insensitive",
              },
            },
          ],
        }),
      }),
    );
    expect(result.total).toBe(1);
    expect(result.items[0]?.id).toBe("client-1");
  });

  it("getTrainerSlotById ограничивает доступ слотом текущего тренера", async () => {
    prismaMock.session.findFirst.mockResolvedValue(null);

    const result = await getTrainerSlotById("trainer-1", "slot-2");

    expect(prismaMock.session.findFirst).toHaveBeenCalledWith({
      where: {
        id: "slot-2",
        type: "personal",
        trainerId: "trainer-1",
      },
      select: {
        id: true,
        title: true,
        description: true,
        startsAt: true,
        durationMinutes: true,
        status: true,
        version: true,
      },
    });
    expect(result).toBeNull();
  });

  it("getTrainerClientById ограничивает доступ только своими клиентами", async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);

    const result = await getTrainerClientById("trainer-1", "client-2");

    expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
      where: {
        id: "client-2",
        role: "client",
        deletedAt: null,
        programs: {
          some: {
            trainerId: "trainer-1",
          },
        },
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        sport: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        programs: {
          where: {
            trainerId: "trainer-1",
          },
          orderBy: [
            {
              startsAt: "desc",
            },
            {
              createdAt: "desc",
            },
          ],
          select: {
            id: true,
            name: true,
            startsAt: true,
            endsAt: true,
            notes: true,
            createdAt: true,
            updatedAt: true,
            template: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
    expect(result).toBeNull();
  });
});
