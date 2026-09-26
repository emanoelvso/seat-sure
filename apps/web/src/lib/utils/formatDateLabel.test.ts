import { describe, expect, it } from "vitest";
import formatLabel from "./formatDateLabel";

describe("formatDateLabel", () => {
  it("asks to select dates when there is no start date", () => {
    expect(formatLabel(undefined)).toBe("Select dates");
  });

  it("formats a single day when only the start date is set", () => {
    expect(formatLabel({ from: new Date(2026, 10, 6) })).toBe("Nov 6, 2026");
  });

  it("formats a single day when start and end are the same date", () => {
    const day = new Date(2026, 10, 6);

    expect(formatLabel({ from: day, to: day })).toBe("Nov 6, 2026");
  });

  it("formats a range with the year once", () => {
    expect(
      formatLabel({ from: new Date(2026, 10, 6), to: new Date(2026, 10, 14) }),
    ).toBe("Nov 6 - Nov 14, 2026");
  });
});
