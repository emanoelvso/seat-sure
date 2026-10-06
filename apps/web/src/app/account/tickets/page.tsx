import type { SearchParams } from "nuqs/server";
import { paths } from "@/config/paths";
import { getAccountOrders } from "@/features/account/api/get-account-orders";
import { AccountOrdersView } from "@/features/account/components/account-orders-view";
import {
  loadAccountOrdersSearchParams,
  serializeAccountOrdersSearchParams,
} from "@/features/account/utils/account-orders-search-params";

// The signed-in user's orders (ACCT-03, ORDLIST-06). Unknown params fall back
// to their defaults in the loader; a page past the end comes back from the
// API as page 1, which is the page the view marks current.
export default async function AccountTicketsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await loadAccountOrdersSearchParams(searchParams);
  const currentPath = serializeAccountOrdersSearchParams(
    paths.accountTickets.getHref(),
    params,
  );
  const data = await getAccountOrders(params, currentPath);

  return (
    <AccountOrdersView data={data} params={{ ...params, page: data.page }} />
  );
}
