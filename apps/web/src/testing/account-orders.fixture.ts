import { zonedIso } from "@/testing/dates";
import type { FindAccountOrdersQuery } from "@/types/__generated__/graphql";

type AccountOrderSummary =
  FindAccountOrdersQuery["findAccountOrders"]["items"][number];

// Orders as findAccountOrders returns them. createdAt is Tue 30 Sep 2025,
// 7:30 PM in env.timeZone, whatever the machine's time zone is.
export function accountOrderSummary(
  overrides: Partial<AccountOrderSummary> = {},
): AccountOrderSummary {
  return {
    __typename: "AccountOrderSummary",
    id: "3f2a9c1b-7d4e-4a2b-9c1d-2e3f4a5b6c7d",
    status: "COMPLETED",
    createdAt: zonedIso(2025, 8, 30, 19, 30),
    eventName: "Adele Concert",
    quantity: 2,
    currency: "USD",
    totalCents: 20000,
    ...overrides,
  };
}

export const completedOrder = accountOrderSummary();

export const canceledOrder = accountOrderSummary({
  id: "8b1e4d7a-2c3f-4e5a-8b9c-0d1e2f3a4b5c",
  status: "CANCELLED",
  eventName: "Dua Lipa Concert",
  totalCents: 12550,
});

export const pendingOrder = accountOrderSummary({
  id: "c4d5e6f7-1a2b-4c3d-9e8f-7a6b5c4d3e2f",
  status: "PENDING",
  eventName: "Coldplay Concert",
});
