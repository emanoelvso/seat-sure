import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatEventDate,
  formatEventLocation,
  formatEventTime,
  formatEventTimeRange,
  formatVenueAddress,
  googleMapsSearchUrl,
} from "@/utils/event-format";
import { zonedIso } from "@/testing/dates";

const eightPm = zonedIso(2026, 10, 6, 20, 0);
const halfPastMidnight = zonedIso(2026, 10, 7, 0, 30);

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
    const startAt = zonedIso(2026, 10, 6, 20, 0);
    const endsAt = zonedIso(2026, 10, 6, 22, 30);

    expect(formatEventTimeRange(startAt, endsAt)).toBe("8:00 PM - 10:30 PM");
  });

  it("formats a range crossing from AM to PM", () => {
    const startAt = zonedIso(2026, 10, 6, 9, 5);
    const endsAt = zonedIso(2026, 10, 6, 12, 0);

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

// 23:00 UTC is 8:00 PM the same day in São Paulo (UTC-3) and 4:30 AM the next
// day in Kolkata (UTC+5:30).
const elevenPmUtc = "2026-11-06T23:00:00.000Z";
// 01:00 UTC on Nov 7 is still Nov 6 in São Paulo.
const oneAmUtcNextDay = "2026-11-07T01:00:00.000Z";
const halfPastOneAmUtcNextDay = "2026-11-07T01:30:00.000Z";

describe("event-format time zone", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("formats an instant in America/Sao_Paulo", () => {
    expect(formatEventTime(elevenPmUtc, "America/Sao_Paulo")).toBe("8:00 PM");
    expect(formatEventDate(elevenPmUtc, "America/Sao_Paulo")).toBe(
      "Nov 06 - 2026",
    );
  });

  it("formats the same instant in UTC", () => {
    expect(formatEventTime(elevenPmUtc, "UTC")).toBe("11:00 PM");
  });

  it("uses the zone's calendar day when the instant crosses midnight between zones", () => {
    expect(formatEventDate(oneAmUtcNextDay, "America/Sao_Paulo")).toBe(
      "Nov 06 - 2026",
    );
    expect(formatEventDate(oneAmUtcNextDay, "UTC")).toBe("Nov 07 - 2026");
  });

  it("formats a time range in the given zone", () => {
    expect(
      formatEventTimeRange(
        elevenPmUtc,
        halfPastOneAmUtcNextDay,
        "America/Sao_Paulo",
      ),
    ).toBe("8:00 PM - 10:30 PM");
    expect(
      formatEventTimeRange(elevenPmUtc, halfPastOneAmUtcNextDay, "UTC"),
    ).toBe("11:00 PM - 1:30 AM");
  });

  it("defaults to env.timeZone", () => {
    vi.stubEnv("NEXT_PUBLIC_TIME_ZONE", "Asia/Kolkata");

    expect(formatEventDate(elevenPmUtc)).toBe("Nov 07 - 2026");
    expect(formatEventTime(elevenPmUtc)).toBe("4:30 AM");
    expect(formatEventTimeRange(elevenPmUtc, halfPastOneAmUtcNextDay)).toBe(
      "4:30 AM - 7:00 AM",
    );
  });
});
