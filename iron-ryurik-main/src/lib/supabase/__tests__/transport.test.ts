import { describe, expect, it } from "vitest";
import { getNodeTransportResponseBody } from "@/lib/supabase/transport";

describe("getNodeTransportResponseBody", () => {
  it("returns null for 204 responses", () => {
    expect(
      getNodeTransportResponseBody(204, "POST", [Buffer.from("ignored")]),
    ).toBeNull();
  });

  it("returns null for HEAD responses", () => {
    expect(getNodeTransportResponseBody(200, "HEAD", [Buffer.from("ignored")])).toBeNull();
  });

  it("concatenates body chunks for normal responses", () => {
    expect(
      getNodeTransportResponseBody(200, "POST", [
        Buffer.from("hello "),
        Buffer.from("world"),
      ])?.toString("utf8"),
    ).toBe("hello world");
  });
});
