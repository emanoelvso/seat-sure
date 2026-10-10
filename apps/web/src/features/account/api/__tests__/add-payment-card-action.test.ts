import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { GraphQLRequestError, graphqlServerFetch } from "@/lib/graphql-server";
import {
  NO_SESSION,
  withAccessToken,
} from "@/features/auth/api/with-access-token";
import { ADD_PAYMENT_CARD } from "@/features/account/api/add-payment-card";
import {
  addPaymentCardAction,
  type AddPaymentCardState,
} from "@/features/account/api/add-payment-card-action";

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

// A far-future expiry, so the card stays valid whatever today is
const card = {
  number: "4242 4242 4242 4242",
  holder: "Ada Lovelace",
  expiry: "08/49",
  cvv: "907",
};

const savedCards = [
  {
    __typename: "PaymentCard" as const,
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

const GENERIC = "Something went wrong. Please try again.";

// The state as JSON never holds the card number (with or without spaces) or
// the CVV (CARD-06 AC 17)
const expectNoCardData = (state: AddPaymentCardState) => {
  const json = JSON.stringify(state);
  expect(json).not.toContain("4242424242424242");
  expect(json).not.toContain("4242 4242 4242 4242");
  expect(json).not.toContain('"907"');
};

describe("addPaymentCardAction", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
    mockedWithAccessToken.mockReset();
    vi.mocked(redirect).mockClear();
    mockedWithAccessToken.mockImplementation((fn) => fn("access-token-1"));
  });

  it("returns each rule's message and makes no API call for an invalid card (CARD-04 AC 7)", async () => {
    const result = await addPaymentCardAction(initialState, {
      number: "4242 4242 4242 4241",
      holder: " ",
      expiry: "13/30",
      cvv: "12",
    });

    expect(result).toEqual({
      status: "error",
      fieldErrors: {
        number: "Enter a valid card number",
        holder: "Enter the name on the card",
        expiry: "Enter a valid expiry date",
        cvv: "Enter a valid CVV",
      },
    });
    expect(mockedWithAccessToken).not.toHaveBeenCalled();
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("sends the card with the token and revalidate: 0, and returns the saved list (CARD-03 AC 2, 3)", async () => {
    mockedFetch.mockResolvedValue({ addPaymentCard: savedCards } as never);

    const result = await addPaymentCardAction(initialState, card);

    expect(result).toEqual({ status: "saved", cards: savedCards });
    expect(mockedFetch).toHaveBeenCalledWith(
      ADD_PAYMENT_CARD,
      { input: card },
      { revalidate: 0, accessToken: "access-token-1" },
    );
    expectNoCardData(result);
  });

  it("returns the API's INVALID_CARD field errors (CARD-04 AC 8)", async () => {
    mockedFetch.mockRejectedValue(
      new GraphQLRequestError(
        "Check your card details.",
        undefined,
        "INVALID_CARD",
        {
          expiry: "Enter a valid expiry date",
        },
      ),
    );

    const result = await addPaymentCardAction(initialState, card);

    expect(result).toEqual({
      status: "error",
      fieldErrors: { expiry: "Enter a valid expiry date" },
    });
  });

  it('shows "This card is already saved." under the card number for DUPLICATE_CARD (CARD-04 AC 9)', async () => {
    mockedFetch.mockRejectedValue(
      new GraphQLRequestError(
        "This card is already saved.",
        undefined,
        "DUPLICATE_CARD",
        {
          number: "This card is already saved.",
        },
      ),
    );

    const result = await addPaymentCardAction(initialState, card);

    expect(result).toEqual({
      status: "error",
      fieldErrors: { number: "This card is already saved." },
    });
    expectNoCardData(result);
  });

  it('returns "This card was declined. Try another card." for CARD_DECLINED (CARD-05 AC 12)', async () => {
    mockedFetch.mockRejectedValue(
      new GraphQLRequestError(
        "This card was declined.",
        undefined,
        "CARD_DECLINED",
      ),
    );

    const result = await addPaymentCardAction(initialState, card);

    expect(result).toEqual({
      status: "error",
      fieldErrors: {},
      formError: "This card was declined. Try another card.",
    });
  });

  it.each([
    [
      "CARD_LIMIT_REACHED",
      new GraphQLRequestError(
        "You can save up to 5 cards.",
        undefined,
        "CARD_LIMIT_REACHED",
      ),
    ],
    ["any other error", new Error("fetch failed")],
  ])(
    "returns the generic form error for %s (CARD-05 AC 13)",
    async (_, error) => {
      mockedFetch.mockRejectedValue(error);

      const result = await addPaymentCardAction(initialState, card);

      expect(result).toEqual({
        status: "error",
        fieldErrors: {},
        formError: GENERIC,
      });
    },
  );

  it("redirects to login with /account/payment when the session can't be refreshed (CARD-06 AC 18)", async () => {
    mockedWithAccessToken.mockResolvedValue(NO_SESSION);

    await expect(addPaymentCardAction(initialState, card)).rejects.toBe(
      REDIRECT_ERROR,
    );

    expect(redirect).toHaveBeenCalledWith(
      "/login?redirectTo=%2Faccount%2Fpayment",
    );
  });
});
