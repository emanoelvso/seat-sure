import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { graphqlServerFetch } from "@/lib/graphql-server";
import { getHomeSections } from "@/features/events/api/get-home-sections";
import { GET_HOME_SECTIONS } from "@/features/events/api/home-sections";
import type { GetHomeSectionsQuery } from "@/types/__generated__/graphql";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/graphql-server");

const mockedFetch = vi.mocked(graphqlServerFetch);

describe("getHomeSections", () => {
  it("fetches the home sections tagged `home` and returns getHomeSections from the data", async () => {
    const sections = {
      concerts: { categories: ["Pop"], events: [{ id: "c1" }] },
      shows: { categories: ["Comedy"], events: [{ id: "s1" }] },
      sports: { categories: ["Football"], events: [{ id: "sp1" }] },
      festivals: { categories: ["Electronic"], events: [{ id: "f1" }] },
    };
    mockedFetch.mockResolvedValueOnce({
      getHomeSections: sections,
    } as unknown as GetHomeSectionsQuery);

    const result = await getHomeSections();

    expect(mockedFetch).toHaveBeenCalledWith(
      GET_HOME_SECTIONS,
      {},
      { tags: ["home"] },
    );
    expect(result).toEqual(sections);
  });

  describe("during `next build`", () => {
    const emptySections = {
      concerts: null,
      shows: null,
      sports: null,
      festivals: null,
    };

    beforeEach(() => {
      vi.stubEnv("NEXT_PHASE", "phase-production-build");
    });

    afterEach(() => {
      vi.unstubAllEnvs();
      vi.restoreAllMocks();
    });

    it("returns empty sections and warns once when the API request fails", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      mockedFetch.mockRejectedValueOnce(new TypeError("fetch failed"));

      const result = await getHomeSections();

      expect(result).toEqual(emptySections);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain("fetch failed");
    });

    it("returns empty sections when NEXT_PUBLIC_API_URL is unset", async () => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      mockedFetch.mockRejectedValueOnce(
        new Error("Missing NEXT_PUBLIC_API_URL"),
      );

      const result = await getHomeSections();

      expect(result).toEqual(emptySections);
    });

    it("returns the API data unchanged when the request succeeds", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const sections = {
        concerts: { categories: ["Pop"], events: [{ id: "c1" }] },
        shows: null,
        sports: null,
        festivals: null,
      };
      mockedFetch.mockResolvedValueOnce({
        getHomeSections: sections,
      } as unknown as GetHomeSectionsQuery);

      const result = await getHomeSections();

      expect(result).toEqual(sections);
      expect(warn).not.toHaveBeenCalled();
    });
  });

  it("rethrows the original error when the request fails outside `next build`", async () => {
    vi.stubEnv("NEXT_PHASE", "");
    const failure = new TypeError("fetch failed");
    mockedFetch.mockRejectedValueOnce(failure);

    await expect(getHomeSections()).rejects.toBe(failure);

    vi.unstubAllEnvs();
  });
});
