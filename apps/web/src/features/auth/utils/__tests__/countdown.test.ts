import { describe, expect, it } from "vitest";
import { formatCountdown } from "@/features/auth/utils/countdown";

describe("formatCountdown (AUTH-25)", () => {
  it.each([
    [60_000, "01:00"],
    [59_001, "01:00"],
    [59_000, "00:59"],
    [1, "00:01"],
    [0, "00:00"],
    [-5, "00:00"],
    [600_000, "10:00"],
  ] as const)("formats %i ms as %s", (ms, expected) => {
    expect(formatCountdown(ms)).toBe(expected);
  });
});
