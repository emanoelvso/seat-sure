import "server-only";
import { graphqlServerFetch } from "@/lib/graphql-server";
import { MY_PROFILE } from "@/features/account/api/find-my-profile";
import { ME } from "@/features/auth/api/me";
import { protectedPageFetch } from "@/features/auth/api/protected-page-fetch";

// The signed-in user's email (read-only field and profile card) and own
// profile for the personal info page (PROFILE-01, PROFILE-02). A missing
// profile row makes the query fail, and the error is rethrown to the account
// route error boundary.
export async function getPersonalInfoPageData(currentPath: string) {
  return protectedPageFetch(currentPath, async (accessToken) => {
    const options = { revalidate: 0, accessToken };
    const [{ me }, { myProfile }] = await Promise.all([
      graphqlServerFetch(ME, {}, options),
      graphqlServerFetch(MY_PROFILE, {}, options),
    ]);

    return { email: me.email, profile: myProfile };
  });
}
