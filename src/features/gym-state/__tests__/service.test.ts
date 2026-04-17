import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";
import { prisma } from "@/lib/prisma";
import { getGymOccupancy, updateGymOccupancy } from "../service";

vi.mock("@/lib/prisma", () => ({
  prisma: mockDeep<any>(),
}));

type RawCall = {
  strings: readonly string[];
  values: unknown[];
};

function lastRawCall(): RawCall {
  const calls = (prisma.$queryRaw as any).mock.calls;
  const last = calls[calls.length - 1];
  // Prisma Sql template result exposes .strings and .values.
  const sql = last[0];
  return { strings: sql.strings, values: sql.values };
}

function fullSql(call: RawCall): string {
  return call.strings.join("?");
}

describe("Gym State Service", () => {
  beforeEach(() => {
    mockReset(prisma as any);
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
    it("sets exact value via atomic upsert", async () => {
      (prisma.$queryRaw as any).mockResolvedValue([{ occupancy: 10 }]);

      const result = await updateGymOccupancy({ exactValue: 10 });

      expect(result).toBe(10);
      const call = lastRawCall();
      expect(fullSql(call)).toContain("GREATEST(0,");
      expect(fullSql(call)).toContain("INSERT INTO \"GymState\"");
      expect(fullSql(call)).toContain("ON CONFLICT");
      expect(call.values).toContain(10);
    });

    it("floors negative exact value to 0 via GREATEST", async () => {
      (prisma.$queryRaw as any).mockResolvedValue([{ occupancy: 0 }]);

      const result = await updateGymOccupancy({ exactValue: -5 });

      expect(result).toBe(0);
      const call = lastRawCall();
      expect(fullSql(call)).toContain("GREATEST(0,");
      expect(call.values).toContain(-5);
    });

    it("increments occupancy by positive delta using atomic add", async () => {
      (prisma.$queryRaw as any).mockResolvedValue([{ occupancy: 6 }]);

      const result = await updateGymOccupancy({ delta: 1 });

      expect(result).toBe(6);
      const call = lastRawCall();
      const sql = fullSql(call);
      // delta branch must add to existing column value, not replace it.
      expect(sql).toContain("\"GymState\".\"occupancy\" +");
      expect(sql).toContain("GREATEST(0,");
      expect(call.values).toContain(1);
    });

    it("keeps occupancy >= 0 when delta would make it negative", async () => {
      (prisma.$queryRaw as any).mockResolvedValue([{ occupancy: 0 }]);

      const result = await updateGymOccupancy({ delta: -10 });

      expect(result).toBe(0);
      const call = lastRawCall();
      expect(fullSql(call)).toContain("GREATEST(0,");
      expect(call.values).toContain(-10);
    });

    it("returns 0 when RETURNING yields no rows", async () => {
      (prisma.$queryRaw as any).mockResolvedValue([]);

      const result = await updateGymOccupancy({ delta: 1 });

      expect(result).toBe(0);
    });
  });
});
