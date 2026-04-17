/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CancelBookingButton } from "@/features/bookings/components/cancel-booking-button";

// Mock the action
vi.mock("@/features/bookings/actions", () => ({
  cancelBooking: vi.fn(),
}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("CancelBookingButton", () => {
  const props = {
    bookingId: "test-id",
    sessionTitle: "Йога",
    cancellationDeadlineHours: 2,
    buttonLabel: "Отменить йогу",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with given label", () => {
    render(<CancelBookingButton {...props} />);
    expect(screen.getByRole("button", { name: /отменить йогу/i })).toBeInTheDocument();
  });

  it("renders with default label if not provided", () => {
    const { buttonLabel, ...rest } = props;
    render(<CancelBookingButton {...rest} />);
    expect(screen.getByRole("button", { name: /отменить запись/i })).toBeInTheDocument();
  });

  it("shows confirmation dialog when clicked", async () => {
    render(<CancelBookingButton {...props} buttonLabel="Удалить запись" />);
    const button = screen.getByText(/удалить запись/i).closest("button");
    if (!button) throw new Error("Button not found");
    fireEvent.click(button);

    // Dialog should appear
    expect(await screen.findByText(/отменить запись\?/i)).toBeInTheDocument();
    expect(screen.getByText(/отмена возможна только не позже чем за 2 ч до начала/i)).toBeInTheDocument();
  });
});
