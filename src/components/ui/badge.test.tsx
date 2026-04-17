/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "@/components/ui/badge";

describe("Badge", () => {
  it("renders with default variant", () => {
    render(<Badge>Новый</Badge>);
    const badge = screen.getByText(/новый/i);
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("bg-primary");
  });

  it("renders with destructive variant", () => {
    render(<Badge variant="destructive">Ошибка</Badge>);
    const badge = screen.getByText(/ошибка/i);
    expect(badge.className).toContain("bg-destructive");
  });

  it("renders with outline variant", () => {
    render(<Badge variant="outline">Черновик</Badge>);
    const badge = screen.getByText(/черновик/i);
    expect(badge.className).toContain("border-border");
  });

  it("supports custom className", () => {
    render(<Badge className="custom-class">Тест</Badge>);
    const badge = screen.getByText(/тест/i);
    expect(badge.className).toContain("custom-class");
  });
});
