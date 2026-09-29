import { graphqlServerFetch } from "@/lib/graphql-server";
import { GET_HOME_SECTIONS } from "@/features/events/api/home-sections";

export async function getHomeSections() {
  const data = await graphqlServerFetch(GET_HOME_SECTIONS, {}, { tags: ["home"] });

  return data.getHomeSections;
}
