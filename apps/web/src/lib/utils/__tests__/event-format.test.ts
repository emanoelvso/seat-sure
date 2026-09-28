import { describe, expect, it } from "vitest";
import {
  formatEventDate,
  formatEventLocation,
  formatEventTime,
  formatEventTimeRange,
  formatVenueAddress,
  googleMapsSearchUrl,
} from "@/lib/utils/event-format";

const eightPm = new Date(2026, 10, 6, 20, 0).toISOString();
const halfPastMidnight = new Date(2026, 10, 7, 0, 30).toISOString();

describe("event-format", () => {
  it("formats the event date as MMM dd - yyyy", () => {
    expect(formatEventDate(eightPm)).toBe("Nov 06 - 2026");
  });

  it("formats the event time on a 12-hour clock", () => {
    expect(formatEventTime(eightPm)).toBe("8:00 PM");
  });

  it("formats times after midnight as AM", () => {
    expect(formatEventTime(halfPastMidnight)).toBe("12:30 AM");
  });

  it("formats an evening time range", () => {
    const startAt = new Date(2026, 10, 6, 20, 0).toISOString();
    const endsAt = new Date(2026, 10, 6, 22, 30).toISOString();

    expect(formatEventTimeRange(startAt, endsAt)).toBe("8:00 PM - 10:30 PM");
  });

  it("formats a range crossing from AM to PM", () => {
    const startAt = new Date(2026, 10, 6, 9, 5).toISOString();
    const endsAt = new Date(2026, 10, 6, 12, 0).toISOString();

    expect(formatEventTimeRange(startAt, endsAt)).toBe("9:05 AM - 12:00 PM");
  });

  it("formats the card location as venue - city, country", () => {
    expect(
      formatEventLocation({
        venue: "The Colosseum at Caesars Palace",
        city: "Las Vegas",
        country: "USA",
      }),
    ).toBe("The Colosseum at Caesars Palace - Las Vegas, USA");
  });

  it("formats the venue address as venue, city, country", () => {
    expect(
      formatVenueAddress({
        venue: "The O2 Arena",
        city: "London",
        country: "United Kingdom",
      }),
    ).toBe("The O2 Arena, London, United Kingdom");
  });

  it("builds a Google Maps search URL with the query URL-encoded", () => {
    expect(googleMapsSearchUrl("Estádio MorumBIS, São Paulo & Co")).toBe(
      "https://www.google.com/maps/search/?api=1&query=Est%C3%A1dio%20MorumBIS%2C%20S%C3%A3o%20Paulo%20%26%20Co",
    );
  });
});
