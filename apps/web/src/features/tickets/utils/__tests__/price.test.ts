import { describe, expect, it } from "vitest";
import { formatPrice } from "@/features/tickets/utils/price";

describe("formatPrice", () => {
  it("formats a whole-dollar amount with no decimals", () => {
    expect(formatPrice(45000)).toBe("$450");
  });

  it("formats a fractional amount with 2 decimals", () => {
    expect(formatPrice(44999)).toBe("$449.99");
  });

  it("formats zero as a whole dollar amount", () => {
    expect(formatPrice(0)).toBe("$0");
  });

  it("formats a large whole-dollar amount with a thousands separator", () => {
    expect(formatPrice(125000)).toBe("$1,250");
  });

  it("formats a sub-dollar amount with 2 decimals", () => {
    expect(formatPrice(5)).toBe("$0.05");
  });
});
