import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireUserRole } from "@/features/auth/get-user";
import { revalidatePath } from "next/cache";
import { setExactOccupancyAction, changeOccupancyAction } from "../actions";
import * as service from "../service";

vi.mock("@/features/auth/get-user", () => ({
  requireUserRole: vi.fn(),
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
  const mockTrainer = { id: "trainer-1", role: "trainer" };

  describe("setExactOccupancyAction", () => {
    it("successfully updates occupancy as admin", async () => {
      vi.mocked(requireUserRole).mockResolvedValue(mockAdmin as any);
      vi.mocked(service.updateGymOccupancy).mockResolvedValue(10);

      const result = await setExactOccupancyAction(10);

      expect(requireUserRole).toHaveBeenCalledWith(["admin", "trainer"]);
      expect(service.updateGymOccupancy).toHaveBeenCalledWith({ exactValue: 10 });
      expect(revalidatePath).toHaveBeenCalledWith("/admin", "layout");
      expect(revalidatePath).toHaveBeenCalledWith("/trainer", "layout");
      expect(revalidatePath).toHaveBeenCalledWith("/client", "layout");
      expect(result).toEqual({ value: 10 });
    });

    it("successfully updates occupancy as trainer", async () => {
      vi.mocked(requireUserRole).mockResolvedValue(mockTrainer as any);
      vi.mocked(service.updateGymOccupancy).mockResolvedValue(7);

      const result = await setExactOccupancyAction(7);

      expect(requireUserRole).toHaveBeenCalledWith(["admin", "trainer"]);
      expect(service.updateGymOccupancy).toHaveBeenCalledWith({ exactValue: 7 });
      expect(result).toEqual({ value: 7 });
    });

    it("propagates auth rejection instead of swallowing it", async () => {
      vi.mocked(requireUserRole).mockRejectedValue(new Error("Unauthorized"));

      await expect(setExactOccupancyAction(10)).rejects.toThrow("Unauthorized");
      expect(service.updateGymOccupancy).not.toHaveBeenCalled();
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("returns graceful error if DB update fails for authorized user", async () => {
      vi.mocked(requireUserRole).mockResolvedValue(mockAdmin as any);
      vi.mocked(service.updateGymOccupancy).mockRejectedValue(new Error("db down"));

      const result = await setExactOccupancyAction(10);

      expect(result).toEqual({ error: expect.stringContaining("Не удалось обновить") });
    });
  });

  describe("changeOccupancyAction", () => {
    it("successfully changes occupancy by delta as admin", async () => {
      vi.mocked(requireUserRole).mockResolvedValue(mockAdmin as any);
      vi.mocked(service.updateGymOccupancy).mockResolvedValue(6);

      const result = await changeOccupancyAction(1);

      expect(requireUserRole).toHaveBeenCalledWith(["admin", "trainer"]);
      expect(service.updateGymOccupancy).toHaveBeenCalledWith({ delta: 1 });
      expect(revalidatePath).toHaveBeenCalledWith("/admin", "layout");
      expect(revalidatePath).toHaveBeenCalledWith("/trainer", "layout");
      expect(revalidatePath).toHaveBeenCalledWith("/client", "layout");
      expect(result).toEqual({ value: 6 });
    });

    it("successfully changes occupancy by delta as trainer", async () => {
      vi.mocked(requireUserRole).mockResolvedValue(mockTrainer as any);
      vi.mocked(service.updateGymOccupancy).mockResolvedValue(4);

      const result = await changeOccupancyAction(-1);

      expect(service.updateGymOccupancy).toHaveBeenCalledWith({ delta: -1 });
      expect(result).toEqual({ value: 4 });
    });

    it("propagates auth rejection instead of swallowing it", async () => {
      vi.mocked(requireUserRole).mockRejectedValue(new Error("Unauthorized"));

      await expect(changeOccupancyAction(1)).rejects.toThrow("Unauthorized");
      expect(service.updateGymOccupancy).not.toHaveBeenCalled();
    });
  });
});
