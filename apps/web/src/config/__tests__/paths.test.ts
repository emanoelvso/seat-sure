import { describe, expect, it } from "vitest";
import { paths } from "@/config/paths";

describe("paths.home", () => {
  it("links to the home page", () => {
    expect(paths.home.getHref()).toBe("/");
  });
});

describe("paths.events", () => {
  it("links to the unfiltered events list without a type", () => {
    expect(paths.events.getHref()).toBe("/events");
  });

  it.each([
    ["SHOW", "/events?type=SHOW"],
    ["CONCERT", "/events?type=CONCERT"],
    ["SPORT", "/events?type=SPORT"],
    ["FESTIVAL", "/events?type=FESTIVAL"],
  ] as const)("links %s to %s", (type, href) => {
    expect(paths.events.getHref(type)).toBe(href);
  });
});

describe("paths.eventTickets", () => {
  it("links to the tickets page of the event", () => {
    expect(paths.eventTickets.getHref("e-1")).toBe("/events/e-1/tickets");
  });

  it("encodes a slash in the event id", () => {
    expect(paths.eventTickets.getHref("e/1")).toBe("/events/e%2F1/tickets");
  });

  it("encodes a space in the event id", () => {
    expect(paths.eventTickets.getHref("e 1")).toBe("/events/e%201/tickets");
  });
});

describe("paths.artist", () => {
  it("links to the artist page of the slug", () => {
    expect(paths.artist.getHref("the-weeknd")).toBe("/artists/the-weeknd");
  });

  it("encodes a slash in the slug", () => {
    expect(paths.artist.getHref("ac/dc")).toBe("/artists/ac%2Fdc");
  });
});
