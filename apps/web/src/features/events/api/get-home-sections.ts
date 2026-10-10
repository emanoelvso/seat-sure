import { graphqlServerFetch } from "@/lib/graphql-server";
import { GET_HOME_SECTIONS } from "@/features/events/api/home-sections";

// `next build` prerenders `/` and must not need a live API. When the request
// fails during the build, the home page is prerendered with empty sections and
// `revalidate` fills it in at runtime.
const EMPTY_HOME_SECTIONS = {
  concerts: null,
  shows: null,
  sports: null,
  festivals: null,
};

export async function getHomeSections() {
  try {
    const data = await graphqlServerFetch(
      GET_HOME_SECTIONS,
      {},
      { tags: ["home"] },
    );

    return data.getHomeSections;
  } catch (error) {
    if (process.env.NEXT_PHASE !== "phase-production-build") throw error;

    const reason = error instanceof Error ? error.message : String(error);
    console.warn(
      `Home sections unavailable during build, prerendering empty: ${reason}`,
    );
    return EMPTY_HOME_SECTIONS;
  }
}
