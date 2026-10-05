import { describe, expect, it } from "vitest";
import { safeRedirect } from "@/features/auth/utils/safe-redirect";

describe("safeRedirect", () => {
  it("keeps an internal path with a query string (AUTH-38)", () => {
    expect(safeRedirect("/events?type=SHOW")).toBe("/events?type=SHOW");
  });

  it.each([
    [undefined, "/"],
    ["", "/"],
    ["https://evil.com", "/"],
    ["//evil.com", "/"],
    ["/\\evil.com", "/"],
    ["javascript:alert(1)", "/"],
    ["events", "/"],
  ] as const)("falls back to / for %j (AUTH-39)", (value, expected) => {
    expect(safeRedirect(value)).toBe(expected);
  });
});
