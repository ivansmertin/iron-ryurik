import { describe, expect, it } from "vitest";
import { adminLinks, clientLinks, trainerLinks } from "@/config/navigation";

describe("navigation", () => {
  it("не содержит ссылок на coming-soon", () => {
    const allLinks = [...clientLinks, ...trainerLinks, ...adminLinks];

    expect(allLinks.some((link) => link.href.includes("coming-soon"))).toBe(false);
  });

  it("оставляет trainer-меню без dead-end ссылок", () => {
    expect(trainerLinks).toEqual([
      { href: "/trainer", label: "Главная" },
      { href: "/trainer/slots", label: "Мои слоты" },
      { href: "/trainer/clients", label: "Мои клиенты" },
    ]);
  });

  it("содержит раздел дневника в client-меню", () => {
    expect(clientLinks).toContainEqual({
      href: "/client/diary",
      label: "Дневник",
    });
  });
});
