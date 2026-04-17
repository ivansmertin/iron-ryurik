import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireUser } from "@/features/auth/get-user";
import { revalidatePath } from "next/cache";
import { setExactOccupancyAction, changeOccupancyAction } from "../actions";
import * as service from "../service";

vi.mock("@/features/auth/get-user", () => ({
  requireUser: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("../service", () => ({
  updateGymOccupancy: vi.fn(),
}));

describe("Gym State Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockAdmin = { id: "admin-1", role: "admin" };

  describe("setExactOccupancyAction", () => {
    it("successfully updates occupancy as admin", async () => {
      vi.mocked(requireUser).mockResolvedValue(mockAdmin as any);
      vi.mocked(service.updateGymOccupancy).mockResolvedValue(10);

      const result = await setExactOccupancyAction(10);

      expect(requireUser).toHaveBeenCalledWith("admin");
      expect(service.updateGymOccupancy).toHaveBeenCalledWith({ exactValue: 10 });
      expect(revalidatePath).toHaveBeenCalledWith("/admin", "layout");
      expect(result).toEqual({ value: 10 });
    });

    it("returns error if user is not authorized", async () => {
      vi.mocked(requireUser).mockRejectedValue(new Error("Unauthorized"));
      
      const result = await setExactOccupancyAction(10);
      
      expect(result).toEqual({ error: expect.stringContaining("Не удалось обновить") });
      expect(service.updateGymOccupancy).not.toHaveBeenCalled();
    });
  });

  describe("changeOccupancyAction", () => {
    it("successfully changes occupancy by delta as admin", async () => {
      vi.mocked(requireUser).mockResolvedValue(mockAdmin as any);
      vi.mocked(service.updateGymOccupancy).mockResolvedValue(6);

      const result = await changeOccupancyAction(1);

      expect(service.updateGymOccupancy).toHaveBeenCalledWith({ delta: 1 });
      expect(result).toEqual({ value: 6 });
    });
  });
});
