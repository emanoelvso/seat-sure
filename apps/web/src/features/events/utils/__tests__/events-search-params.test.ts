import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PRICE_RANGES,
  loadEventsSearchParams,
  serializeEventsSearchParams,
  toFindEventsInput,
} from "@/features/events/utils/events-search-params";
import { EVENT_TYPES } from "@/utils/event-types";

const unset = {
  type: null,
  price: null,
  city: null,
  from: null,
  to: null,
  page: 1,
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("loadEventsSearchParams", () => {
  it("parses a valid value for every param", () => {
    expect(
      loadEventsSearchParams(
        "?type=SHOW&city=Paris&price=100-300&from=2026-10-01&to=2026-10-05&page=3",
      ),
    ).toEqual({
      type: "SHOW",
      city: "Paris",
      price: "100-300",
      from: "2026-10-01",
      to: "2026-10-05",
      page: 3,
    });
  });

  it.each(EVENT_TYPES)("parses type=%s", (type) => {
    expect(loadEventsSearchParams(`?type=${type}`).type).toBe(type);
  });

  it.each(PRICE_RANGES)("parses price=%s", (price) => {
    expect(
      loadEventsSearchParams(new URLSearchParams({ price })).price,
    ).toBe(price);
  });

  // MIG-45. page=2.5 is added because parseInt("1.5") is also the default 1.
  it.each([
    "type=concert",
    "price=50-100",
    "from=2026-02-30",
    "from=2026-1-5",
    "to=2026-02-30",
    "page=abc",
    "page=1.5",
    "page=2.5",
  ])("treats %s as unset", (query) => {
    expect(loadEventsSearchParams(`?${query}`)).toEqual(unset);
  });

  it("clamps page 0 to 1 and page 51 to 50 (MIG-46)", () => {
    expect(loadEventsSearchParams("?page=0").page).toBe(1);
    expect(loadEventsSearchParams("?page=51").page).toBe(50);
  });
});

describe("serializeEventsSearchParams", () => {
  it("round-trips through the loader", () => {
    const values = {
      type: "FESTIVAL" as const,
      city: "São Paulo",
      price: "+500" as const,
      from: "2026-12-30",
      to: "2027-01-02",
      page: 4,
    };

    expect(loadEventsSearchParams(serializeEventsSearchParams(values))).toEqual(
      values,
    );
  });
});

describe("toFindEventsInput", () => {
  it("fetches page × 20 events from offset 0", () => {
    expect(toFindEventsInput({ page: 3 })).toEqual({ limit: 60, offset: 0 });
  });

  it("clamps the page to 1..50", () => {
    expect(toFindEventsInput({ page: 0 }).limit).toBe(20);
    expect(toFindEventsInput({ page: 51 }).limit).toBe(1000);
  });

  it("sends `from` as the start of that day in America/Sao_Paulo", () => {
    vi.stubEnv("NEXT_PUBLIC_TIME_ZONE", "America/Sao_Paulo");

    expect(toFindEventsInput({ from: "2026-10-01" }).dateRange).toEqual({
      from: "2026-10-01T03:00:00.000Z",
    });
  });

  it("sends `from` as the start of that day in UTC", () => {
    vi.stubEnv("NEXT_PUBLIC_TIME_ZONE", "UTC");

    expect(toFindEventsInput({ from: "2026-10-01" }).dateRange).toEqual({
      from: "2026-10-01T00:00:00.000Z",
    });
  });

  it("leaves `to` out when it's missing", () => {
    vi.stubEnv("NEXT_PUBLIC_TIME_ZONE", "UTC");

    expect(toFindEventsInput({ from: "2026-10-01" }).dateRange).not.toHaveProperty(
      "to",
    );
  });

  it("maps every filter into the input", () => {
    vi.stubEnv("NEXT_PUBLIC_TIME_ZONE", "America/Sao_Paulo");

    expect(
      toFindEventsInput({
        type: "SHOW",
        city: "Paris",
        price: "300-500",
        from: "2026-10-01",
        to: "2026-10-05",
        page: 2,
      }),
    ).toEqual({
      type: "SHOW",
      city: "Paris",
      priceRange: { min: 300, max: 500 },
      dateRange: {
        from: "2026-10-01T03:00:00.000Z",
        to: "2026-10-05T03:00:00.000Z",
      },
      limit: 40,
      offset: 0,
    });
  });

  // "-100" keeps today's { min: 100 }, a known bug logged for a follow-up
  // (spec Out of Scope).
  it.each([
    ["-100", { min: 100 }],
    ["100-300", { min: 100, max: 300 }],
    ["300-500", { min: 300, max: 500 }],
    ["+500", { min: 500 }],
  ] as const)("maps price=%s to today's price range", (price, priceRange) => {
    expect(toFindEventsInput({ price }).priceRange).toEqual(priceRange);
  });
});
