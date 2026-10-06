import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  FindAccountOrdersQuery,
  FindAccountOrdersQueryVariables,
} from "@/types/__generated__/graphql";

// One page of the signed-in user's orders in a tab, plus the count of every
// tab (ORDLIST-01, ORDLIST-02).
export const FIND_ACCOUNT_ORDERS: TypedDocumentNode<
  FindAccountOrdersQuery,
  FindAccountOrdersQueryVariables
> = gql`
  query findAccountOrders($input: FindAccountOrdersInput!) {
    findAccountOrders(input: $input) {
      items {
        id
        status
        createdAt
        eventName
        quantity
        currency
        totalCents
      }
      counts {
        all
        pending
        cancelled
        completed
      }
      page
      totalPages
    }
  }
`;

export type AccountOrdersPage = FindAccountOrdersQuery["findAccountOrders"];
export type AccountOrderSummary = AccountOrdersPage["items"][number];
export type AccountOrderCounts = AccountOrdersPage["counts"];
