/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renders a submit button when type is submit", () => {
    render(<Button type="submit">Создать</Button>);
    const button = screen.getByRole("button", { name: /создать/i });
    expect(button).toHaveAttribute("type", "submit");
  });

  it("defaults to a regular button when type is omitted", () => {
    render(<Button>Открыть</Button>);
    const button = screen.getByRole("button", { name: /открыть/i });
    expect(button).toHaveAttribute("type", "button");
  });

  it("calls onClick when clicked", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Нажми меня</Button>);
    const button = screen.getByRole("button", { name: /нажми меня/i });
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("applies variant classes", () => {
    render(<Button variant="destructive">Удалить</Button>);
    const button = screen.getByRole("button", { name: /удалить/i });
    // Check if it has destructive specific classes. 
    // In our cva it's bg-destructive or similar.
    expect(button.className).toContain("bg-destructive");
  });

  it("is disabled when disabled prop is true", () => {
    render(<Button disabled>Загрузка</Button>);
    const button = screen.getByRole("button", { name: /загрузка/i });
    expect(button).toBeDisabled();
  });
});
