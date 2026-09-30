import { createLoader } from "nuqs/server";
import { describe, expect, it } from "vitest";
import { ticketsParsers } from "@/features/tickets/utils/tickets-search-params";

const loadTicketsSearchParams = createLoader(ticketsParsers);

describe("ticketsParsers", () => {
  it("parses a valid value for every param (MIG-48)", () => {
    expect(
      loadTicketsSearchParams("?quantity=3&min=250&max=420&sort=asc"),
    ).toEqual({ quantity: 3, min: 250, max: 420, sort: "asc" });
  });

  it.each(["asc", "desc"] as const)("parses sort=%s", (sort) => {
    expect(loadTicketsSearchParams(`?sort=${sort}`).sort).toBe(sort);
  });

  // MIG-51: any other sort reads as desc. `asc` is checked above, so a parser
  // that always returns desc fails there.
  it.each(["price", "ASC"])("reads sort=%j as desc", (sort) => {
    expect(loadTicketsSearchParams(new URLSearchParams({ sort })).sort).toBe(
      "desc",
    );
  });

  it("reads desc when sort is missing (MIG-51)", () => {
    expect(loadTicketsSearchParams("").sort).toBe("desc");
  });

  // MIG-49 / MIG-50: values that aren't integers are unset.
  it.each([
    ["quantity", "abc"],
    ["quantity", "2.5"],
    ["min", "1.5"],
    ["max", "abc"],
  ])("treats %s=%s as unset", (param, value) => {
    expect(
      loadTicketsSearchParams(new URLSearchParams({ [param]: value })),
    ).toEqual({ quantity: null, min: null, max: null, sort: "desc" });
  });
});
