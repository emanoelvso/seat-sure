import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { GraphQLRequestError, graphqlServerFetch } from "@/lib/graphql-server";
import {
  NO_SESSION,
  withAccessToken,
} from "@/features/auth/api/with-access-token";
import { MY_PAYMENT_CARDS } from "@/features/account/api/find-my-payment-cards";
import { REMOVE_PAYMENT_CARD } from "@/features/account/api/remove-payment-card";
import { SET_DEFAULT_PAYMENT_CARD } from "@/features/account/api/set-default-payment-card";
import {
  removePaymentCardAction,
  setDefaultPaymentCardAction,
} from "@/features/account/api/payment-card-actions";

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

const card = (id: string, last4: string, isDefault: boolean) => ({
  __typename: "PaymentCard" as const,
  id,
  brand: "visa",
  last4,
  expMonth: 8,
  expYear: 2049,
  holder: "Ada Lovelace",
  isDefault,
  expired: false,
});

const reorderedCards = [
  card("card-2", "4444", true),
  card("card-1", "4242", false),
];
const remainingCards = [card("card-1", "4242", true)];
const freshCards = [
  card("card-1", "4242", true),
  card("card-3", "1881", false),
];

const GENERIC = "Something went wrong. Please try again.";
const OPTIONS = { revalidate: 0, accessToken: "access-token-1" };

const cardNotFound = () =>
  new GraphQLRequestError(
    "This card is no longer available.",
    undefined,
    "CARD_NOT_FOUND",
  );

// Answers each document; the mutation answers with `mutationResult`, or
// rejects with it when it is an Error
function mockApi(mutationResult: unknown) {
  mockedFetch.mockImplementation((async (document: unknown) => {
    if (document === MY_PAYMENT_CARDS) return { myPaymentCards: freshCards };
    if (mutationResult instanceof Error) throw mutationResult;
    if (document === SET_DEFAULT_PAYMENT_CARD) {
      return { setDefaultPaymentCard: mutationResult };
    }
    if (document === REMOVE_PAYMENT_CARD) {
      return { removePaymentCard: mutationResult };
    }
    throw new Error("unexpected document");
  }) as unknown as typeof graphqlServerFetch);
}

describe.each([
  {
    name: "setDefaultPaymentCardAction",
    action: setDefaultPaymentCardAction,
    document: SET_DEFAULT_PAYMENT_CARD,
    cards: reorderedCards,
  },
  {
    name: "removePaymentCardAction",
    action: removePaymentCardAction,
    document: REMOVE_PAYMENT_CARD,
    cards: remainingCards,
  },
])("$name", ({ action, document, cards }) => {
  beforeEach(() => {
    mockedFetch.mockReset();
    mockedWithAccessToken.mockReset();
    vi.mocked(redirect).mockClear();
    mockedWithAccessToken.mockImplementation((fn) => fn("access-token-1"));
  });

  it("sends the card id with the token and revalidate: 0, and returns the new list (CARD-10 AC 4, 7)", async () => {
    mockApi(cards);

    const result = await action("card-2");

    expect(result).toEqual({ cards });
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(mockedFetch).toHaveBeenCalledWith(
      document,
      { input: { id: "card-2" } },
      OPTIONS,
    );
  });

  it("answers CARD_NOT_FOUND with notFound and a freshly queried list (CARD-11 AC 10)", async () => {
    mockApi(cardNotFound());

    const result = await action("card-gone");

    expect(result).toEqual({ notFound: true, cards: freshCards });
    expect(mockedFetch).toHaveBeenCalledWith(MY_PAYMENT_CARDS, {}, OPTIONS);
  });

  it.each([
    [
      "another business error",
      new GraphQLRequestError("Nope", undefined, "CARD_LIMIT_REACHED"),
    ],
    ["a network error", new Error("fetch failed")],
  ])("returns the generic error for %s (CARD-11 AC 11)", async (_, error) => {
    mockApi(error);

    const result = await action("card-2");

    expect(result).toEqual({ error: GENERIC });
  });

  it("redirects to login with /account/payment when the session can't be refreshed (CARD-11 AC 12)", async () => {
    mockedWithAccessToken.mockResolvedValue(NO_SESSION);

    await expect(action("card-2")).rejects.toBe(REDIRECT_ERROR);

    expect(redirect).toHaveBeenCalledWith(
      "/login?redirectTo=%2Faccount%2Fpayment",
    );
  });
});
