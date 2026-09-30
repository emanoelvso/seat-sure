import { describe, expect, it } from "vitest";
import { parseAsStrictInteger } from "@/utils/search-params";

describe("parseAsStrictInteger", () => {
  it.each([
    ["3", 3],
    ["250", 250],
    ["-1", -1],
  ])("parses %s as %i", (value, expected) => {
    expect(parseAsStrictInteger.parse(value)).toBe(expected);
  });

  // MIG-45 / MIG-50: a value that isn't an integer is unset. parseInt would
  // read "1.5" as 1, "2.5" as 2 and "3x" as 3.
  it.each(["abc", "1.5", "2.5", "3x"])("treats %j as unset", (value) => {
    expect(parseAsStrictInteger.parse(value)).toBeNull();
  });

  it("serializes an integer as its digits", () => {
    expect(parseAsStrictInteger.serialize(420)).toBe("420");
  });
});
