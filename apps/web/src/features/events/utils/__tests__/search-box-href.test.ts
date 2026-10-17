import { describe, expect, it } from "vitest";
import { searchBoxHref } from "@/features/events/utils/search-box-href";

describe("searchBoxHref", () => {
  it("goes to the unfiltered list when nothing is set", () => {
    expect(searchBoxHref({ type: null, city: "", day: "" })).toBe("/events");
  });

  it("carries the type, city and day as the events filters", () => {
    expect(
      searchBoxHref({ type: "SHOW", city: "Paris", day: "2026-10-01" }),
    ).toBe("/events?type=SHOW&city=Paris&from=2026-10-01&to=2026-10-01");
  });

  it("drops a city that is only blanks and trims the rest", () => {
    expect(searchBoxHref({ type: null, city: "   ", day: "" })).toBe("/events");
    expect(searchBoxHref({ type: null, city: " Rio ", day: "" })).toBe(
      "/events?city=Rio",
    );
  });
});
