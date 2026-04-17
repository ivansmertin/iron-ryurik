/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Input } from "@/components/ui/input";

describe("Input", () => {
  it("renders correctly", () => {
    render(<Input placeholder="Введите имя" />);
    const input = screen.getByPlaceholderText(/введите имя/i);
    expect(input).toBeInTheDocument();
  });

  it("handles value changes", () => {
    const handleChange = vi.fn();
    const { container } = render(<Input onChange={handleChange} />);
    const input = container.querySelector("input");
    if (!input) throw new Error("Input not found");
    fireEvent.change(input, { target: { value: "Hello" } });
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it("is disabled when disabled prop is true", () => {
    const { container } = render(<Input disabled />);
    const input = container.querySelector("input");
    if (!input) throw new Error("Input not found");
    expect(input).toBeDisabled();
  });

  it("applies aria-invalid when invalid", () => {
    const { container } = render(<Input aria-invalid="true" />);
    const input = container.querySelector("input");
    if (!input) throw new Error("Input not found");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });
});
