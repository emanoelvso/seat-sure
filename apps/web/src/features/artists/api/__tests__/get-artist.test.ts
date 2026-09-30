import { describe, expect, it, vi } from "vitest";
import { graphqlServerFetch } from "@/lib/graphql-server";
import { getArtist } from "@/features/artists/api/get-artist";
import { FIND_ARTIST_BY_SLUG } from "@/features/artists/api/find-artist-by-slug";
import type { FindArtistBySlugQuery } from "@/types/__generated__/graphql";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/graphql-server");

const mockedFetch = vi.mocked(graphqlServerFetch);

describe("getArtist", () => {
  it("sends the given slug as input and returns its own findArtistBySlug result", async () => {
    mockedFetch.mockResolvedValueOnce({
      findArtistBySlug: { artist: { name: "Adele" } },
    } as unknown as FindArtistBySlugQuery);

    const result = await getArtist("adele");

    expect(mockedFetch).toHaveBeenCalledWith(
      FIND_ARTIST_BY_SLUG,
      { input: { slug: "adele" } },
      { tags: ["artist:adele"] },
    );
    expect(result).toEqual({ artist: { name: "Adele" } });
  });

  it("sends a different slug as input and returns a different findArtistBySlug result (L-001)", async () => {
    mockedFetch.mockResolvedValueOnce({
      findArtistBySlug: { artist: { name: "Coldplay" } },
    } as unknown as FindArtistBySlugQuery);

    const result = await getArtist("coldplay");

    expect(mockedFetch).toHaveBeenCalledWith(
      FIND_ARTIST_BY_SLUG,
      { input: { slug: "coldplay" } },
      { tags: ["artist:coldplay"] },
    );
    expect(result).toEqual({ artist: { name: "Coldplay" } });
  });
});
