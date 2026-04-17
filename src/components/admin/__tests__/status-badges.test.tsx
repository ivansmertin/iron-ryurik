/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  SessionStatusBadge,
  MembershipStatusBadge,
  BookingStatusBadge,
  BooleanBadge,
} from "@/components/admin/status-badges";

describe("StatusBadges", () => {
  describe("SessionStatusBadge", () => {
    it("renders scheduled status correctly", () => {
      render(<SessionStatusBadge status="scheduled" />);
      expect(screen.getByText(/запланировано/i)).toBeInTheDocument();
      expect(screen.getByText(/запланировано/i).className).toContain("bg-primary");
    });

    it("renders cancelled status correctly", () => {
      render(<SessionStatusBadge status="cancelled" />);
      expect(screen.getByText(/отменено/i)).toBeInTheDocument();
      expect(screen.getByText(/отменено/i).className).toContain("bg-destructive");
    });
  });

  describe("MembershipStatusBadge", () => {
    it("renders active status", () => {
      render(<MembershipStatusBadge status="active" />);
      expect(screen.getByText(/активен/i)).toBeInTheDocument();
    });

    it("renders expired status", () => {
      render(<MembershipStatusBadge status="expired" />);
      expect(screen.getByText(/истёк/i)).toBeInTheDocument();
      expect(screen.getByText(/истёк/i).className).toContain("border-border");
    });
  });

  describe("BookingStatusBadge", () => {
    it("renders pending status", () => {
      render(<BookingStatusBadge status="pending" />);
      expect(screen.getByText(/забронировано/i)).toBeInTheDocument();
    });

    it("renders no_show status", () => {
      render(<BookingStatusBadge status="no_show" />);
      expect(screen.getByText(/неявка/i)).toBeInTheDocument();
    });
  });

  describe("BooleanBadge", () => {
    it("renders true value", () => {
      render(<BooleanBadge value={true} trueLabel="Да" falseLabel="Нет" />);
      expect(screen.getByText("Да")).toBeInTheDocument();
    });

    it("renders false value", () => {
      render(<BooleanBadge value={false} trueLabel="Да" falseLabel="Нет" />);
      expect(screen.getByText("Нет")).toBeInTheDocument();
    });
  });
});
