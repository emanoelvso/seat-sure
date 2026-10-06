import { zonedIso } from "@/testing/dates";
import type {
  FindAccountOrderQuery,
  FindAccountOrdersQuery,
} from "@/types/__generated__/graphql";

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

type AccountOrdersPage = FindAccountOrdersQuery["findAccountOrders"];

// One findAccountOrders page. The default is page 1 of 2 in a 7-order account
// (All tab): four cards, then three on page 2.
export function accountOrdersPage(
  overrides: Partial<AccountOrdersPage> = {},
): AccountOrdersPage {
  return {
    __typename: "AccountOrdersPage",
    items: [
      completedOrder,
      canceledOrder,
      pendingOrder,
      accountOrderSummary({
        id: "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
        eventName: "Travis Scott Concert",
        quantity: 1,
      }),
    ],
    counts: {
      __typename: "AccountOrderCounts",
      all: 7,
      pending: 4,
      cancelled: 2,
      completed: 1,
    },
    page: 1,
    totalPages: 2,
    ...overrides,
  };
}

type AccountOrderDetail = NonNullable<
  FindAccountOrderQuery["findAccountOrder"]
>;

// A paid order as findAccountOrder returns it: 2 VIP seats in row 7, $15
// service fee + $5 tax, $260 in total, paid by Visa 4242.
export function accountOrderDetail(
  overrides: Partial<AccountOrderDetail> = {},
): AccountOrderDetail {
  return {
    __typename: "AccountOrderDetail",
    id: "3f2a9c1b-7d4e-4a2b-9c1d-2e3f4a5b6c7d",
    status: "COMPLETED",
    createdAt: zonedIso(2025, 8, 12, 13, 57),
    event: {
      __typename: "AccountOrderEvent",
      name: "Adele Concert",
      coverImage: "/artist/map.png",
      venue: "American Airlines Center",
      city: "Dallas",
      country: "USA",
      startAt: zonedIso(2025, 8, 30, 19, 30),
    },
    ticketTypeName: "VIP",
    items: [
      { __typename: "AccountOrderItem", row: "7", number: "10" },
      { __typename: "AccountOrderItem", row: "7", number: "07" },
    ],
    quantity: 2,
    currency: "USD",
    serviceFeeCents: 1500,
    taxCents: 500,
    totalCents: 26000,
    paymentId: "7984bd83-3827-4c1a-9e2f-5a6b7c8d9e0f",
    paymentCard: {
      __typename: "AccountOrderPaymentCard",
      brand: "visa",
      last4: "4242",
    },
    ...overrides,
  };
}

// A cancelled order before payment: one seat, no payment id, no card.
export const canceledOrderDetail = accountOrderDetail({
  id: "8b1e4d7a-2c3f-4e5a-8b9c-0d1e2f3a4b5c",
  status: "CANCELLED",
  items: [{ __typename: "AccountOrderItem", row: "3", number: "04" }],
  quantity: 1,
  serviceFeeCents: 750,
  taxCents: 250,
  totalCents: 13500,
  paymentId: null,
  paymentCard: null,
});

export const accountUser = { firstName: "Negar", lastName: "Khosravi" };
