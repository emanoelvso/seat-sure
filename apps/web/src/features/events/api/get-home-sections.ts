import { graphqlServerFetch } from "@/lib/graphql-server";
import {
  GET_HOME_SECTIONS,
  GetHomeSectionsData,
} from "@/features/events/api/home-sections";

export async function getHomeSections() {
  const data = await graphqlServerFetch<
    GetHomeSectionsData,
    Record<string, never>
  >(GET_HOME_SECTIONS, {}, { tags: ["home"] });

  return data.getHomeSections;
}
