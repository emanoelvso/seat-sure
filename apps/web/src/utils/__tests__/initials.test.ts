import { describe, expect, it } from "vitest";
import { getInitials } from "@/utils/initials";

describe("getInitials (AUTH-43)", () => {
  it("uppercases both names' first letters", () => {
    expect(getInitials("negar", "khosravi", "negar@example.com")).toBe("NK");
  });

  it("uses only the first name's letter when there's no last name", () => {
    expect(getInitials("Ana", "", "ana@example.com")).toBe("A");
  });

  it("uses only the last name's letter when there's no first name", () => {
    expect(getInitials("", "Silva", "silva@example.com")).toBe("S");
  });

  it("falls back to the email's first letter when both names are empty", () => {
    expect(getInitials("", "", "zoe@x.com")).toBe("Z");
  });

  it("ignores surrounding spaces in the names", () => {
    expect(getInitials("  negar  ", "  khosravi  ", "negar@example.com")).toBe(
      "NK",
    );
  });

  it("ignores surrounding spaces in the email fallback", () => {
    expect(getInitials("  ", "  ", "  zoe@x.com  ")).toBe("Z");
  });
});
