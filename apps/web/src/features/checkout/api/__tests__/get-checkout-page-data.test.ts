import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { GraphQLRequestError, graphqlServerFetch } from "@/lib/graphql-server";
import { ME } from "@/features/auth/api/me";
import {
  readAccessToken,
  readRefreshToken,
} from "@/features/auth/api/session-cookies";
import { CHECKOUT_PAYMENT_CARDS } from "@/features/checkout/api/find-checkout-payment-cards";
import { FIND_CHECKOUT_ORDER } from "@/features/checkout/api/find-checkout-order";
import { getCheckoutPageData } from "@/features/checkout/api/get-checkout-page-data";

const { REDIRECT_ERROR } = vi.hoisted(() => ({
  REDIRECT_ERROR: new Error("NEXT_REDIRECT"),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw REDIRECT_ERROR;
  }),
}));
vi.mock("@/lib/graphql-server", async () => {
  const actual = await vi.importActual<typeof import("@/lib/graphql-server")>(
    "@/lib/graphql-server",
  );
  return { ...actual, graphqlServerFetch: vi.fn() };
});
vi.mock("@/features/auth/api/session-cookies");

const mockedFetch = vi.mocked(graphqlServerFetch);
const mockedReadAccessToken = vi.mocked(readAccessToken);
const mockedReadRefreshToken = vi.mocked(readRefreshToken);

const order = {
  __typename: "CheckoutOrder" as const,
  id: "o1",
  status: "PENDING" as const,
  expiresAt: "2026-11-01T00:10:00.000Z",
  secondsLeft: 600,
  quantity: 1,
  currency: "usd",
  subtotalCents: 1000,
  serviceFeeCents: 150,
  taxCents: 80,
  totalCents: 1230,
  unitPriceCents: 1000,
  unitServiceFeeCents: 150,
  unitTaxCents: 80,
  event: {
    __typename: "CheckoutEvent" as const,
    id: "e1",
    name: "A Show",
    coverImage: "cover.jpg",
    venue: "The Venue",
    city: "City",
    country: "Country",
    startAt: "2026-11-01T20:00:00.000Z",
  },
  ticketType: { __typename: "CheckoutTicketType" as const, id: "t1", name: "GA" },
  items: [{ __typename: "CheckoutOrderItem" as const, seatId: "s1", row: "A", number: "07" }],
};

const user = {
  __typename: "CurrentUser" as const,
  id: "user-1",
  email: "a@example.com",
  firstName: "Nadia",
  lastName: "Kahn",
  avatarUrl: null,
};

const cards = [
  {
    __typename: "PaymentCard" as const,
    id: "card-1",
    brand: "visa",
    last4: "4242",
    expMonth: 8,
    expYear: 2030,
    holder: "Nadia Kahn",
    isDefault: true,
    expired: false,
  },
];

async function expectRedirectTo(target: string, call: () => Promise<unknown>) {
  await expect(call()).rejects.toBe(REDIRECT_ERROR);
  expect(redirect).toHaveBeenCalledWith(target);
}

describe("getCheckoutPageData", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
    mockedReadAccessToken.mockReset();
    mockedReadRefreshToken.mockReset();
    vi.mocked(redirect).mockClear();
  });

  it("fetches findCheckoutOrder and me with the token and revalidate: 0 (PAY-23)", async () => {
    mockedReadAccessToken.mockResolvedValue("access-token-1");
    mockedFetch.mockImplementation(async (document) => {
      if (document === FIND_CHECKOUT_ORDER) {
        return { findCheckoutOrder: order };
      }
      if (document === ME) {
        return { me: user };
      }
      if (document === CHECKOUT_PAYMENT_CARDS) {
        return { myPaymentCards: [] };
      }
      throw new Error("unexpected document");
    });

    const result = await getCheckoutPageData("o1", "/checkout/o1");

    expect(result).toEqual({ order, user, cards: [] });
    expect(mockedFetch).toHaveBeenCalledWith(
      FIND_CHECKOUT_ORDER,
      { input: { orderId: "o1" } },
      { revalidate: 0, accessToken: "access-token-1" },
    );
    expect(mockedFetch).toHaveBeenCalledWith(
      ME,
      {},
      { revalidate: 0, accessToken: "access-token-1" },
    );
  });

  it("passes a paused order's payment action through to the page (GW-30)", async () => {
    const paused = {
      ...order,
      status: "REQUIRES_ACTION" as const,
      paymentAction: {
        __typename: "PaymentAction" as const,
        provider: "simulated",
        clientSecret: "sim_secret_abc",
      },
    };
    mockedReadAccessToken.mockResolvedValue("access-token-1");
    mockedFetch.mockImplementation(async (document) => {
      if (document === FIND_CHECKOUT_ORDER) {
        return { findCheckoutOrder: paused };
      }
      if (document === ME) {
        return { me: user };
      }
      return { myPaymentCards: [] };
    });

    const result = await getCheckoutPageData("o1", "/checkout/o1");

    expect(result.order).toEqual(paused);
    expect(result.order?.paymentAction).toEqual({
      __typename: "PaymentAction",
      provider: "simulated",
      clientSecret: "sim_secret_abc",
    });
  });

  it("redirects to the refresh route when the token is missing but a refresh cookie exists (PAY-22)", async () => {
    mockedReadAccessToken.mockResolvedValue(undefined);
    mockedReadRefreshToken.mockResolvedValue("refresh-token-1");

    await expectRedirectTo("/api/auth/refresh?redirectTo=%2Fcheckout%2Fo1", () =>
      getCheckoutPageData("o1", "/checkout/o1"),
    );
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("redirects to /login when there's no token and no refresh cookie (PAY-03)", async () => {
    mockedReadAccessToken.mockResolvedValue(undefined);
    mockedReadRefreshToken.mockResolvedValue(undefined);

    await expectRedirectTo("/login?redirectTo=%2Fcheckout%2Fo1", () =>
      getCheckoutPageData("o1", "/checkout/o1"),
    );
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("redirects to the refresh route when the access token is rejected (PAY-22)", async () => {
    mockedReadAccessToken.mockResolvedValue("rejected-access-token");
    mockedFetch.mockRejectedValue(
      new GraphQLRequestError("Unauthenticated", "UNAUTHENTICATED"),
    );

    await expectRedirectTo("/api/auth/refresh?redirectTo=%2Fcheckout%2Fo1", () =>
      getCheckoutPageData("o1", "/checkout/o1"),
    );
  });

  it("rethrows any other error", async () => {
    mockedReadAccessToken.mockResolvedValue("access-token-1");
    const boom = new Error("boom");
    mockedFetch.mockRejectedValue(boom);

    await expect(getCheckoutPageData("o1", "/checkout/o1")).rejects.toBe(boom);
  });

  it("returns the saved cards from checkoutPaymentCards with the token (CARD-07 AC 1)", async () => {
    mockedReadAccessToken.mockResolvedValue("access-token-1");
    mockedFetch.mockImplementation(async (document) => {
      if (document === FIND_CHECKOUT_ORDER) return { findCheckoutOrder: order };
      if (document === ME) return { me: user };
      if (document === CHECKOUT_PAYMENT_CARDS) return { myPaymentCards: cards };
      throw new Error("unexpected document");
    });

    const result = await getCheckoutPageData("o1", "/checkout/o1");

    expect(result).toEqual({ order, user, cards });
    expect(mockedFetch).toHaveBeenCalledWith(
      CHECKOUT_PAYMENT_CARDS,
      {},
      { revalidate: 0, accessToken: "access-token-1" },
    );
  });

  it("falls back to no cards when the cards query fails, and still loads the order (CARD-07 edge case)", async () => {
    mockedReadAccessToken.mockResolvedValue("access-token-1");
    mockedFetch.mockImplementation(async (document) => {
      if (document === FIND_CHECKOUT_ORDER) return { findCheckoutOrder: order };
      if (document === ME) return { me: user };
      throw new GraphQLRequestError(
        "Internal server error",
        "INTERNAL_SERVER_ERROR",
      );
    });

    const result = await getCheckoutPageData("o1", "/checkout/o1");

    expect(result).toEqual({ order, user, cards: [] });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("redirects to the refresh route when only the cards query is UNAUTHENTICATED", async () => {
    mockedReadAccessToken.mockResolvedValue("access-token-1");
    mockedFetch.mockImplementation(async (document) => {
      if (document === FIND_CHECKOUT_ORDER) return { findCheckoutOrder: order };
      if (document === ME) return { me: user };
      throw new GraphQLRequestError("Unauthenticated", "UNAUTHENTICATED");
    });

    await expectRedirectTo("/api/auth/refresh?redirectTo=%2Fcheckout%2Fo1", () =>
      getCheckoutPageData("o1", "/checkout/o1"),
    );
  });
  it.each([
    ["order", FIND_CHECKOUT_ORDER],
    ["user", ME],
    ["cards", CHECKOUT_PAYMENT_CARDS],
  ])("refreshes when only the %s query rejects the session (CHKINT-05)", async (_, failedDocument) => {
    mockedReadAccessToken.mockResolvedValue("access-token-1");
    mockedFetch.mockImplementation(async (document) => {
      if (document === failedDocument) throw new GraphQLRequestError("Unauthenticated", "UNAUTHENTICATED");
      if (document === FIND_CHECKOUT_ORDER) return { findCheckoutOrder: order };
      if (document === ME) return { me: user };
      return { myPaymentCards: cards };
    });
    await expectRedirectTo("/api/auth/refresh?redirectTo=%2Fcheckout%2Fo1", () =>
      getCheckoutPageData("o1", "/checkout/o1"),
    );
  });

  it.each([["order", FIND_CHECKOUT_ORDER], ["user", ME]])(
    "propagates the same %s query error (CHKINT-07)", async (_, failedDocument) => {
      mockedReadAccessToken.mockResolvedValue("access-token-1");
      const error = new GraphQLRequestError("Unavailable", "INTERNAL_SERVER_ERROR");
      mockedFetch.mockImplementation(async (document) => {
        if (document === failedDocument) throw error;
        if (document === FIND_CHECKOUT_ORDER) return { findCheckoutOrder: order };
        if (document === ME) return { me: user };
        return { myPaymentCards: cards };
      });
      await expect(getCheckoutPageData("o1", "/checkout/o1")).rejects.toBe(error);
      expect(redirect).not.toHaveBeenCalled();
    },
  );

});
