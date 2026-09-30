import { describe, expect, it, vi } from "vitest";
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
});
