import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { GraphQLRequestError, graphqlServerFetch } from "@/lib/graphql-server";
import {
  NO_SESSION,
  withAccessToken,
} from "@/features/auth/api/with-access-token";
import { ADD_PAYMENT_METHOD } from "@/features/account/api/add-payment-method";
import { addPaymentMethodAction } from "@/features/account/api/add-payment-method-action";
import type { AddPaymentCardState } from "@/features/account/api/add-payment-card-action";

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
vi.mock("@/features/auth/api/with-access-token", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/auth/api/with-access-token")
  >("@/features/auth/api/with-access-token");
  return { ...actual, withAccessToken: vi.fn() };
});

const mockedFetch = vi.mocked(graphqlServerFetch);
const mockedWithAccessToken = vi.mocked(withAccessToken);
const initialState: AddPaymentCardState = { status: "idle", fieldErrors: {} };
const savedCards = [
  {
    id: "card-1",
    brand: "visa",
    last4: "4242",
    expMonth: 8,
    expYear: 2049,
    holder: "Ada Lovelace",
    isDefault: true,
    expired: false,
  },
];

describe("addPaymentMethodAction", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
    mockedWithAccessToken.mockReset();
    vi.mocked(redirect).mockClear();
    mockedWithAccessToken.mockImplementation((fn) => fn("access-token-1"));
  });

  it("sends only the PaymentMethod id and returns the saved list (GW-41)", async () => {
    mockedFetch.mockResolvedValueOnce({ addPaymentMethod: savedCards });

    const result = await addPaymentMethodAction(initialState, "pm_123");

    expect(mockedFetch).toHaveBeenCalledWith(
      ADD_PAYMENT_METHOD,
      { input: { paymentMethodId: "pm_123" } },
      { revalidate: 0, accessToken: "access-token-1" },
    );
    expect(result).toEqual({ status: "saved", cards: savedCards });
    expect(JSON.stringify(result)).not.toContain("pm_123");
  });

  it("maps a declined card to a form error", async () => {
    mockedFetch.mockRejectedValueOnce(
      new GraphQLRequestError("declined", "BAD_USER_INPUT", "CARD_DECLINED"),
    );

    expect(await addPaymentMethodAction(initialState, "pm_123")).toEqual({
      status: "error",
      fieldErrors: {},
      formError: "This card was declined. Try another card.",
    });
  });

  it("maps the attempts limit to a form error", async () => {
    mockedFetch.mockRejectedValueOnce(
      new GraphQLRequestError("limited", "BAD_USER_INPUT", "CARD_ATTEMPTS_LIMITED"),
    );

    expect(await addPaymentMethodAction(initialState, "pm_123")).toEqual({
      status: "error",
      fieldErrors: {},
      formError: "Too many card attempts. Try again in 15 minutes.",
    });
  });

  it("maps any other failure to the generic error without echoing the id", async () => {
    mockedFetch.mockRejectedValueOnce(new Error("boom"));

    const result = await addPaymentMethodAction(initialState, "pm_123");

    expect(result).toEqual({
      status: "error",
      fieldErrors: {},
      formError: "Something went wrong. Please try again.",
    });
    expect(JSON.stringify(result)).not.toContain("pm_123");
  });

  it("sends a visitor without a session to log in", async () => {
    mockedWithAccessToken.mockResolvedValueOnce(NO_SESSION);

    await expect(addPaymentMethodAction(initialState, "pm_123")).rejects.toBe(
      REDIRECT_ERROR,
    );
    expect(redirect).toHaveBeenCalledWith("/login?redirectTo=%2Faccount%2Fpayment");
  });
});
