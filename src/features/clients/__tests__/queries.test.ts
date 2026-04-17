import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";
import { prisma } from "@/lib/prisma";
import { listClients, getClientProfile } from "../queries";

vi.mock("@/lib/prisma", () => ({
  prisma: mockDeep<any>(),
}));

describe("Clients Queries", () => {
  beforeEach(() => {
    mockReset(prisma as any);
  });

  describe("listClients", () => {
    it("returns active clients and filters out deleted ones", async () => {
      vi.mocked(prisma.user.count).mockResolvedValue(1);
      vi.mocked(prisma.user.findMany).mockResolvedValue([
        {
          id: "client-1",
          fullName: "John Doe",
          email: "john@example.com",
          role: "client",
          deletedAt: null,
          memberships: [],
          createdAt: new Date(),
        },
      ] as any);

      const result = await listClients({ page: 1, pageSize: 20, query: "" });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            role: "client",
            deletedAt: null,
          },
        })
      );
      expect(result.items).toHaveLength(1);
      expect(result.items[0].fullName).toBe("John Doe");
    });

    it("applies search query correctly", async () => {
      await listClients({ page: 1, pageSize: 20, query: "search-term" });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { fullName: { contains: "search-term", mode: "insensitive" } },
              { email: { contains: "search-term", mode: "insensitive" } },
            ],
          }),
        })
      );
    });
  });

  describe("getClientProfile", () => {
    it("returns profile for active client", async () => {
      const mockProfile = {
        id: "client-1",
        fullName: "John Doe",
        role: "client",
        deletedAt: null,
      };
      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockProfile as any);

      const result = await getClientProfile("client-1");

      expect(result).toEqual(mockProfile);
      expect(prisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: "client-1",
            role: "client",
            deletedAt: null,
          },
        })
      );
    });

    it("returns null for deleted client", async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
      const result = await getClientProfile("deleted-client");
      expect(result).toBeNull();
    });
  });
});
