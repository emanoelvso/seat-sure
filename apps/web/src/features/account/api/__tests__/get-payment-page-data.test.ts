import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { GraphQLRequestError, graphqlServerFetch } from "@/lib/graphql-server";
import {
  readAccessToken,
  readRefreshToken,
} from "@/features/auth/api/session-cookies";
import { MY_PAYMENT_CARDS } from "@/features/account/api/find-my-payment-cards";
import { getPaymentPageData } from "@/features/account/api/get-payment-page-data";

const { REDIRECT_ERROR } = vi.hoisted(() => ({
  REDIRECT_ERROR: new Error("NEXT_REDIRECT"),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw REDIRECT_ERROR;
  }),
}));
vi.mock("@/features/auth/api/session-cookies");
vi.mock("@/lib/graphql-server", async () => {
  const actual = await vi.importActual<typeof import("@/lib/graphql-server")>(
    "@/lib/graphql-server",
  );
  return { ...actual, graphqlServerFetch: vi.fn() };
});

const mockedFetch = vi.mocked(graphqlServerFetch);
const mockedReadAccessToken = vi.mocked(readAccessToken);
const mockedReadRefreshToken = vi.mocked(readRefreshToken);

const PATH = "/account/payment";

const myPaymentCards = [
  {
    __typename: "PaymentCard" as const,
    id: "card-1",
    brand: "visa",
    last4: "4242",
    expMonth: 8,
    expYear: 2030,
    holder: "Ada Lovelace",
    isDefault: true,
    expired: false,
  },
  {
    __typename: "PaymentCard" as const,
    id: "card-2",
    brand: "mastercard",
    last4: "4444",
    expMonth: 1,
    expYear: 2031,
    holder: "Ada Lovelace",
    isDefault: false,
    expired: false,
  },
];

describe("getPaymentPageData", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
    mockedReadAccessToken.mockReset();
    mockedReadRefreshToken.mockReset();
    vi.mocked(redirect).mockClear();
  });

  it("returns the caller's saved cards in the API's order, requested with the token and revalidate: 0 (CARD-01 AC 3, CARD-02 AC 9)", async () => {
    mockedReadAccessToken.mockResolvedValue("access-token-1");
    mockedFetch.mockResolvedValue({ myPaymentCards } as never);

    const result = await getPaymentPageData(PATH);

    expect(result).toEqual({ cards: myPaymentCards });
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(mockedFetch).toHaveBeenCalledWith(
      MY_PAYMENT_CARDS,
      {},
      {
        revalidate: 0,
        accessToken: "access-token-1",
      },
    );
  });

  it("redirects to login when there is no session (CARD-02 AC 7)", async () => {
    mockedReadAccessToken.mockResolvedValue(undefined);
    mockedReadRefreshToken.mockResolvedValue(undefined);

    await expect(getPaymentPageData(PATH)).rejects.toBe(REDIRECT_ERROR);

    expect(redirect).toHaveBeenCalledWith(
      "/login?redirectTo=%2Faccount%2Fpayment",
    );
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("redirects through the refresh route when only a refresh cookie exists (CARD-02 AC 8)", async () => {
    mockedReadAccessToken.mockResolvedValue(undefined);
    mockedReadRefreshToken.mockResolvedValue("refresh-token-1");

    await expect(getPaymentPageData(PATH)).rejects.toBe(REDIRECT_ERROR);

    expect(redirect).toHaveBeenCalledWith(
      "/api/auth/refresh?redirectTo=%2Faccount%2Fpayment",
    );
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("rethrows an error other than UNAUTHENTICATED for the route error boundary", async () => {
    mockedReadAccessToken.mockResolvedValue("access-token-1");
    const failure = new GraphQLRequestError("Boom", "INTERNAL_SERVER_ERROR");
    mockedFetch.mockRejectedValue(failure);

    await expect(getPaymentPageData(PATH)).rejects.toBe(failure);
    expect(redirect).not.toHaveBeenCalled();
  });
});
