import { describe, expect, it } from "vitest";
import { GqlEvent } from "@/graphql/queries/home-sections";
import { cityKey, splitArtistEvents } from "@/features/artists/utils/artist-events";

const now = new Date(2026, 8, 26, 12, 0);

const event = (id: string, city: string, country: string, startAt: Date) =>
  ({
    id,
    city,
    country,
    venue: `${city} Arena`,
    startAt: startAt.toISOString(),
  }) as GqlEvent;

const group = (city: string, country: string, events: GqlEvent[]) => ({
  city,
  country,
  events,
});

const ids = (events: GqlEvent[]) => events.map((e) => e.id);

describe("splitArtistEvents", () => {
  const lasVegas = group("Las Vegas", "USA", [
    event("lv1", "Las Vegas", "USA", new Date(2026, 9, 1)),
    event("lv2", "Las Vegas", "USA", new Date(2026, 9, 8)),
  ]);
  const newYork = group("New York", "USA", [
    event("ny1", "New York", "USA", new Date(2026, 10, 20)),
  ]);
  const london = group("London", "United Kingdom", [
    event("lon1", "London", "United Kingdom", new Date(2026, 9, 10)),
  ]);

  it("returns the group matching the selected city key", () => {
    const { selected } = splitArtistEvents(
      [lasVegas, newYork, london],
      cityKey(newYork),
      now,
    );

    expect(selected).toBe(newYork);
  });

  it("lists other cities' events sorted by startAt", () => {
    const { upcomingElsewhere } = splitArtistEvents(
      [lasVegas, newYork, london],
      cityKey(lasVegas),
      now,
    );

    expect(ids(upcomingElsewhere)).toEqual(["lon1", "ny1"]);
  });

  it("keeps events before now + 6 months and drops the one exactly at it", () => {
    const edge = group("Paris", "France", [
      event("at-limit", "Paris", "France", new Date(2027, 2, 26, 12, 0)),
      event("just-before", "Paris", "France", new Date(2027, 2, 26, 11, 59)),
    ]);

    const { upcomingElsewhere } = splitArtistEvents(
      [lasVegas, edge],
      cityKey(lasVegas),
      now,
    );

    expect(ids(upcomingElsewhere)).toEqual(["just-before"]);
  });

  it("keeps same-named cities in different countries apart", () => {
    const londonCanada = group("London", "Canada", [
      event("lon-ca", "London", "Canada", new Date(2026, 9, 5)),
    ]);

    const { selected, upcomingElsewhere } = splitArtistEvents(
      [london, londonCanada],
      cityKey(londonCanada),
      now,
    );

    expect(selected).toBe(londonCanada);
    expect(ids(upcomingElsewhere)).toEqual(["lon1"]);
  });

  it("has nothing elsewhere when the artist plays a single city", () => {
    const { selected, upcomingElsewhere } = splitArtistEvents(
      [lasVegas],
      cityKey(lasVegas),
      now,
    );

    expect(selected).toBe(lasVegas);
    expect(upcomingElsewhere).toEqual([]);
  });

  it("handles an artist without upcoming events", () => {
    expect(splitArtistEvents([], undefined, now)).toEqual({
      selected: undefined,
      upcomingElsewhere: [],
    });
  });

  it("returns no selected group for an unknown key", () => {
    const { selected } = splitArtistEvents(
      [lasVegas, newYork],
      "Atlantis|Nowhere",
      now,
    );

    expect(selected).toBeUndefined();
  });
});
