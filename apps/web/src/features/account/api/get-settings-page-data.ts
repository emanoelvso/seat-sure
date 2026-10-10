import "server-only";
import { graphqlServerFetch } from "@/lib/graphql-server";
import { protectedPageFetch } from "@/features/auth/api/protected-page-fetch";
import { MY_SETTINGS } from "@/features/account/api/find-my-settings";
import { paths } from "@/config/paths";

export function getSettingsPageData() {
  return protectedPageFetch(
    paths.accountSettings.getHref(),
    async (accessToken) => {
      const { mySettings } = await graphqlServerFetch(
        MY_SETTINGS,
        {},
        { revalidate: 0, accessToken },
      );
      return mySettings;
    },
  );
}
