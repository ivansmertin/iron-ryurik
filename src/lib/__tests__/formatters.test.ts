import { describe, expect, it } from "vitest";
import { formatBookingCancelReason } from "@/lib/formatters";

describe("formatBookingCancelReason", () => {
  it("shows client cancellation in user-facing wording", () => {
    expect(formatBookingCancelReason("client_cancelled")).toBe("вы отменили запись");
  });

  it("shows gym cancellation in user-facing wording", () => {
    expect(formatBookingCancelReason("session_cancelled")).toBe(
      "занятие отменено залом",
    );
  });
});
