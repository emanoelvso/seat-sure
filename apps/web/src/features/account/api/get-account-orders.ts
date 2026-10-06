import "server-only";
import { graphqlServerFetch } from "@/lib/graphql-server";
import { FIND_ACCOUNT_ORDERS } from "@/features/account/api/find-account-orders";
import {
  ACCOUNT_ORDERS_PAGE_SIZE,
  type AccountOrdersSearchParams,
  type OrderSort,
  type OrderStatus,
} from "@/features/account/utils/account-orders-search-params";
import { protectedPageFetch } from "@/features/auth/api/protected-page-fetch";
import type {
  AccountOrdersSort,
  AccountOrdersTab,
} from "@/types/__generated__/schema";

// The web tab value is the US spelling of the frame; the API enum is CANCELLED.
const TABS: Record<OrderStatus, AccountOrdersTab> = {
  all: "ALL",
  pending: "PENDING",
  canceled: "CANCELLED",
  completed: "COMPLETED",
};

const SORTS: Record<OrderSort, AccountOrdersSort> = {
  newest: "NEWEST",
  oldest: "OLDEST",
  highest: "HIGHEST_AMOUNT",
  lowest: "LOWEST_AMOUNT",
};

// One page of the signed-in user's orders (ORDLIST-02, ORDLIST-04). Never
// cached: the list depends on the user and on the API clock (order expiry).
export async function getAccountOrders(
  { status, sort, page }: AccountOrdersSearchParams,
  currentPath: string,
) {
  return protectedPageFetch(currentPath, async (accessToken) => {
    const { findAccountOrders } = await graphqlServerFetch(
      FIND_ACCOUNT_ORDERS,
      {
        input: {
          tab: TABS[status],
          sort: SORTS[sort],
          page,
          pageSize: ACCOUNT_ORDERS_PAGE_SIZE,
        },
      },
      { revalidate: 0, accessToken },
    );

    return findAccountOrders;
  });
}
