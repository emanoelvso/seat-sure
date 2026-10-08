import "server-only";
import { graphqlServerFetch } from "@/lib/graphql-server";
import { MY_NOTIFICATIONS } from "@/features/account/api/find-my-notifications";
import {
  NOTIFICATIONS_PAGE_SIZE,
  type AccountNotificationsSearchParams,
  type NotificationTab,
} from "@/features/account/utils/account-notifications-search-params";
import { protectedPageFetch } from "@/features/auth/api/protected-page-fetch";
import type { NotificationsTab } from "@/types/__generated__/schema";

const TABS: Record<NotificationTab, NotificationsTab> = {
  all: "ALL",
  unread: "UNREAD",
  read: "READ",
};

// One page of the signed-in user's notifications (NOTIF-06, NOTIF-08). Never
// cached: the list depends on the user and changes as they read. Any error
// other than UNAUTHENTICATED is rethrown to the account route error boundary.
export async function getNotificationsPageData(
  { tab, page }: AccountNotificationsSearchParams,
  currentPath: string,
) {
  return protectedPageFetch(currentPath, async (accessToken) => {
    const { myNotifications } = await graphqlServerFetch(
      MY_NOTIFICATIONS,
      { input: { tab: TABS[tab], page, pageSize: NOTIFICATIONS_PAGE_SIZE } },
      { revalidate: 0, accessToken },
    );

    return myNotifications;
  });
}
