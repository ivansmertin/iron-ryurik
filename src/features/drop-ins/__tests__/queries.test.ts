import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  dropInPass: {
    count: vi.fn(),
    findMany: vi.fn(),
    groupBy: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/prisma-read", () => ({
  withPrismaReadRetry: (operation: () => Promise<unknown>) => operation(),
}));

import {
  getDropInPassStats,
  listDropInPasses,
} from "@/features/drop-ins/queries";

describe("drop-ins queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns schemaReady=false when DropInPass table is missing", async () => {
    prismaMock.dropInPass.count.mockRejectedValue({
      code: "P2021",
      meta: { modelName: "DropInPass" },
      message: "The table `public.DropInPass` does not exist",
    });

    const result = await listDropInPasses({
      page: 1,
      pageSize: 20,
    });

    expect(result).toEqual({
      schemaReady: false,
      items: [],
      total: 0,
      totalPages: 1,
    });
  });

  it("returns empty stats object on schema drift", async () => {
    prismaMock.dropInPass.groupBy.mockRejectedValue({
      code: "P2022",
      meta: { modelName: "DropInPass" },
      message: "Column missing",
    });

    await expect(getDropInPassStats()).resolves.toEqual({});
  });
});
