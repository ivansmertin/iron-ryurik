import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";
import { prisma } from "@/lib/prisma";
import { getGymOccupancy, updateGymOccupancy } from "../service";

vi.mock("@/lib/prisma", () => ({
  prisma: mockDeep<any>(),
}));

describe("Gym State Service", () => {
  beforeEach(() => {
    mockReset(prisma as any);
    
    // Default transaction mock
    (prisma.$transaction as any).mockImplementation(async (cb: any) => {
      return cb(prisma);
    });
  });

  describe("getGymOccupancy", () => {
    it("returns stored occupancy", async () => {
      vi.mocked(prisma.gymState.findUnique).mockResolvedValue({ id: 1, occupancy: 5 } as any);
      const result = await getGymOccupancy();
      expect(result).toBe(5);
    });

    it("returns 0 if no record exists", async () => {
      vi.mocked(prisma.gymState.findUnique).mockResolvedValue(null);
      const result = await getGymOccupancy();
      expect(result).toBe(0);
    });
  });

  describe("updateGymOccupancy", () => {
    it("sets exact value correctly", async () => {
      vi.mocked(prisma.gymState.upsert).mockResolvedValue({ id: 1, occupancy: 10 } as any);
      
      const result = await updateGymOccupancy({ exactValue: 10 });
      
      expect(prisma.gymState.upsert).toHaveBeenCalledWith(expect.objectContaining({
        update: { occupancy: 10 },
        create: { id: 1, occupancy: 10 }
      }));
      expect(result).toBe(10);
    });

    it("increments occupancy correctly using delta", async () => {
      vi.mocked(prisma.gymState.findUnique).mockResolvedValue({ id: 1, occupancy: 5 } as any);
      vi.mocked(prisma.gymState.upsert).mockResolvedValue({ id: 1, occupancy: 6 } as any);
      
      const result = await updateGymOccupancy({ delta: 1 });
      
      expect(prisma.gymState.upsert).toHaveBeenCalledWith(expect.objectContaining({
        update: { occupancy: 6 }
      }));
      expect(result).toBe(6);
    });

    it("ensures occupancy does not go below 0", async () => {
      vi.mocked(prisma.gymState.findUnique).mockResolvedValue({ id: 1, occupancy: 0 } as any);
      vi.mocked(prisma.gymState.upsert).mockResolvedValue({ id: 1, occupancy: 0 } as any);
      
      const result = await updateGymOccupancy({ delta: -1 });
      
      expect(prisma.gymState.upsert).toHaveBeenCalledWith(expect.objectContaining({
        update: { occupancy: 0 }
      }));
      expect(result).toBe(0);
    });
  });
});
