import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/features/auth/get-user";
import { redirect } from "next/navigation";
import { updateClientNotes, updateClientProfile } from "../actions";

vi.mock("@/lib/prisma", () => ({
  prisma: mockDeep<any>(),
}));

vi.mock("@/features/auth/get-user", () => ({
  requireUser: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Clients Actions", () => {
  beforeEach(() => {
    mockReset(prisma as any);
    vi.clearAllMocks();
  });

  const mockAdmin = { id: "admin-1", role: "admin" };
  const mockClient = { id: "client-1", role: "client" };

  describe("updateClientNotes", () => {
    it("successfully updates notes as admin", async () => {
      vi.mocked(requireUser).mockResolvedValue(mockAdmin as any);
      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockClient as any);

      const formData = new FormData();
      formData.append("notes", "Some internal notes");

      await updateClientNotes("client-1", {}, formData);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "client-1" },
        data: { notes: "Some internal notes" },
      });
      expect(redirect).toHaveBeenCalledWith(expect.stringContaining("notes-updated"));
    });

    it("returns error if client is not found or deleted", async () => {
      vi.mocked(requireUser).mockResolvedValue(mockAdmin as any);
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      const formData = new FormData();
      const result = await updateClientNotes("invalid-id", {}, formData);

      expect(result.error).toBe("Клиент не найден.");
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe("updateClientProfile", () => {
    it("successfully updates own profile as client", async () => {
      vi.mocked(requireUser).mockResolvedValue(mockClient as any);

      const formData = new FormData();
      formData.append("fullName", "John Updated");
      formData.append("phone", "+79991234567");
      formData.append("sport", "running");

      const result = await updateClientProfile(undefined, formData);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockClient.id },
        data: {
          fullName: "John Updated",
          phone: "+79991234567",
          sport: "running",
        },
      });
      expect(result).toEqual({ ok: true });
    });

    it("returns validation errors for invalid data", async () => {
      vi.mocked(requireUser).mockResolvedValue(mockClient as any);

      const formData = new FormData();
      formData.append("fullName", ""); // Invalid: empty

      const result: any = await updateClientProfile(undefined, formData);

      expect(result.fieldErrors).toBeDefined();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });
});
