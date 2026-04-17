import { describe, expect, it } from "vitest";
import { adminSidebarLinks as adminLinks, clientLinks, trainerLinks } from "@/config/navigation";

describe("navigation", () => {
  it("не содержит ссылок на coming-soon", () => {
    const allLinks = [...clientLinks, ...trainerLinks, ...adminLinks];

    expect(allLinks.some((link) => link.href.includes("coming-soon"))).toBe(false);
  });

  it("оставляет trainer-меню без dead-end ссылок", () => {
    expect(trainerLinks.map((l) => l.href)).toEqual([
      "/trainer",
      "/trainer/slots",
      "/trainer/scan",
      "/trainer/clients",
    ]);
  });

  it("содержит раздел дневника в client-меню", () => {
    expect(clientLinks.some((l) => l.href === "/client/diary")).toBe(true);
  });

  it("все ссылки имеют иконку", () => {
    const allLinks = [...clientLinks, ...trainerLinks, ...adminLinks];

    for (const link of allLinks) {
      expect(typeof link.icon).toBe("string");
      expect(link.icon.length).toBeGreaterThan(0);
    }
  });
});
