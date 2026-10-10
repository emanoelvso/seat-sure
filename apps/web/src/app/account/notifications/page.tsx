import type { SearchParams } from "nuqs/server";
import { paths } from "@/config/paths";
import { getNotificationsPageData } from "@/features/account/api/get-notifications-page-data";
import { NotificationsView } from "@/features/account/components/notifications-view";
import {
  loadAccountNotificationsSearchParams,
  serializeAccountNotificationsSearchParams,
} from "@/features/account/utils/account-notifications-search-params";

export default async function AccountNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await loadAccountNotificationsSearchParams(searchParams);
  const currentPath = serializeAccountNotificationsSearchParams(
    paths.accountNotifications.getHref(),
    params,
  );
  const data = await getNotificationsPageData(params, currentPath);
  const now = new Date().toISOString();

  return (
    <NotificationsView
      key={`${params.tab}:${data.page}:${now}`}
      data={data}
      params={{ ...params, page: data.page }}
      now={now}
    />
  );
}
