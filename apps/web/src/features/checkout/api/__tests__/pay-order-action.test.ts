import { beforeEach, describe, expect, it, vi } from "vitest";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { GraphQLRequestError, graphqlServerFetch } from "@/lib/graphql-server";
import { NO_SESSION, withAccessToken } from "@/features/auth/api/with-access-token";
import { PAY_ORDER } from "@/features/checkout/api/pay-order";
import {
  payOrderAction,
  type PayOrderState,
} from "@/features/checkout/api/pay-order-action";

const { REDIRECT_ERROR } = vi.hoisted(() => ({
  REDIRECT_ERROR: new Error("NEXT_REDIRECT"),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw REDIRECT_ERROR;
  }),
}));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));
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

const initialState: PayOrderState = {};

// A Luhn-valid 16-digit number and a future expiry, so it clears the
// client-side card-schema check and only the mocked API call decides the
// outcome.
const validCard = {
  number: "4242424242424242",
  holder: "Jane Doe",
  expiry: "12/99",
  cvv: "999",
};

function buildInput(card = validCard) {
  return { orderId: "order-1", card };
}

async function expectRedirectTo(target: string, input: ReturnType<typeof buildInput>) {
  await expect(payOrderAction(initialState, input)).rejects.toBe(REDIRECT_ERROR);
  expect(redirect).toHaveBeenCalledWith(target);
}

describe("payOrderAction", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
    mockedWithAccessToken.mockReset();
    vi.mocked(redirect).mockClear();
    vi.mocked(refresh).mockClear();
  });

  it("navigates to the success page on success (PAY-48)", async () => {
    mockedWithAccessToken.mockImplementation((fn) => fn("access-token-1"));
    mockedFetch.mockResolvedValueOnce({ payOrder: { id: "order-1" } });

    await expectRedirectTo("/checkout/order-1/success", buildInput());

    expect(mockedFetch).toHaveBeenCalledWith(
      PAY_ORDER,
      { input: { orderId: "order-1", card: validCard } },
      { revalidate: 0, accessToken: "access-token-1" },
    );
  });

  it("validates the card client-side, returns field errors and makes no API call (PAY-36)", async () => {
    const result = await payOrderAction(
      initialState,
      buildInput({ number: "1", holder: "", expiry: "bad", cvv: "bad" }),
    );

    expect(result.reason).toBe("INVALID_CARD");
    expect(result.fields).toMatchObject({
      number: "Enter a valid card number",
      holder: "Enter the name on the card",
      expiry: "Enter a valid expiry date",
      cvv: "Enter a valid CVV",
    });
    expect(mockedFetch).not.toHaveBeenCalled();
    expect(mockedWithAccessToken).not.toHaveBeenCalled();
  });

  it.each([
    "CARD_DECLINED",
    "SEATS_UNAVAILABLE",
    "ORDER_EXPIRED",
    "CARD_ATTEMPTS_LIMITED",
    "AUTHENTICATION_FAILED",
  ] as const)(
    "passes %s through as the reason (PAY-50, PAY-51, PAY-61, CARDABUSE-03 AC 2)",
    async (reason) => {
      mockedWithAccessToken.mockImplementation((fn) => fn("access-token-1"));
      mockedFetch.mockRejectedValueOnce(
        new GraphQLRequestError("failed", "BAD_USER_INPUT", reason),
      );

      const result = await payOrderAction(initialState, buildInput());

      expect(result).toEqual({ reason });
      expect(redirect).not.toHaveBeenCalled();
      expect(refresh).not.toHaveBeenCalled();
    },
  );

  describe("when the bank asks for 3-D Secure (GW-08)", () => {
    const paused = {
      payOrder: {
        id: "order-1",
        status: "REQUIRES_ACTION",
        paymentAction: { provider: "simulated", clientSecret: "sim_secret_abc" },
      },
    };

    it("returns the payment action instead of navigating", async () => {
      mockedWithAccessToken.mockImplementation((fn) => fn("access-token-1"));
      mockedFetch.mockResolvedValueOnce(paused as never);

      const result = await payOrderAction(initialState, buildInput());

      expect(result).toEqual({
        requiresAction: { provider: "simulated", clientSecret: "sim_secret_abc" },
      });
      expect(redirect).not.toHaveBeenCalled();
    });

    it("keeps the Stripe provider and treats any other as simulated", async () => {
      mockedWithAccessToken.mockImplementation((fn) => fn("access-token-1"));
      mockedFetch.mockResolvedValueOnce({
        payOrder: {
          ...paused.payOrder,
          paymentAction: { provider: "stripe", clientSecret: "pi_secret" },
        },
      } as never);

      const result = await payOrderAction(initialState, buildInput());

      expect(result.requiresAction).toEqual({
        provider: "stripe",
        clientSecret: "pi_secret",
      });
    });

    it("still navigates to the success page when the order is paid", async () => {
      mockedWithAccessToken.mockImplementation((fn) => fn("access-token-1"));
      mockedFetch.mockResolvedValueOnce({
        payOrder: { id: "order-1", status: "PAID", paymentAction: null },
      } as never);

      await expectRedirectTo("/checkout/order-1/success", buildInput());
    });

    it("never puts the client secret in a failure state", async () => {
      mockedWithAccessToken.mockImplementation((fn) => fn("access-token-1"));
      mockedFetch.mockRejectedValueOnce(
        new GraphQLRequestError("declined", "BAD_USER_INPUT", "CARD_DECLINED"),
      );

      const result = await payOrderAction(initialState, buildInput());

      expect(result).toEqual({ reason: "CARD_DECLINED" });
      expect(JSON.stringify(result)).not.toContain("secret");
    });
  });

  it("passes INVALID_CARD through with the API's field errors (PAY-52)", async () => {
    mockedWithAccessToken.mockImplementation((fn) => fn("access-token-1"));
    mockedFetch.mockRejectedValueOnce(
      new GraphQLRequestError("invalid", "BAD_USER_INPUT", "INVALID_CARD", {
        cvv: "Enter a valid CVV",
      }),
    );

    const result = await payOrderAction(initialState, buildInput());

    expect(result).toEqual({
      reason: "INVALID_CARD",
      fields: { cvv: "Enter a valid CVV" },
    });
  });

  it("maps any other error to GENERIC (PAY-53)", async () => {
    mockedWithAccessToken.mockImplementation((fn) => fn("access-token-1"));
    mockedFetch.mockRejectedValueOnce(
      new GraphQLRequestError("nope", "BAD_USER_INPUT", "ORDER_ALREADY_PAID"),
    );

    const result = await payOrderAction(initialState, buildInput());

    expect(result).toEqual({ reason: "GENERIC" });
  });

  it("redirects to /login with the checkout URL as redirectTo on NO_SESSION (PAY-03)", async () => {
    mockedWithAccessToken.mockResolvedValue(NO_SESSION);

    await expectRedirectTo(
      "/login?redirectTo=%2Fcheckout%2Forder-1",
      buildInput(),
    );
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("never echoes the card number or CVV back in the returned state (PAY-36)", async () => {
    mockedWithAccessToken.mockImplementation((fn) => fn("access-token-1"));
    mockedFetch.mockRejectedValueOnce(
      new GraphQLRequestError("invalid", "BAD_USER_INPUT", "INVALID_CARD", {
        cvv: "Enter a valid CVV",
      }),
    );

    const result = await payOrderAction(initialState, buildInput());
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain(validCard.number);
    expect(serialized).not.toContain(validCard.cvv);
  });

  describe("with a saved card (CARD-08)", () => {
    const savedInput = { orderId: "order-1", savedCardId: "card-1" };

    it("sends savedCardId and no card, then navigates to the success page on PAID (AC 8)", async () => {
      mockedWithAccessToken.mockImplementation((fn) => fn("access-token-1"));
      mockedFetch.mockResolvedValueOnce({ payOrder: { id: "order-1" } });

      await expect(payOrderAction(initialState, savedInput)).rejects.toBe(
        REDIRECT_ERROR,
      );

      expect(redirect).toHaveBeenCalledWith("/checkout/order-1/success");
      expect(mockedFetch).toHaveBeenCalledTimes(1);
      const [, variables] = mockedFetch.mock.calls[0];
      expect(variables).toStrictEqual({
        input: { orderId: "order-1", savedCardId: "card-1" },
      });
    });

    it("maps CARD_NOT_FOUND to its own reason (AC 9)", async () => {
      mockedWithAccessToken.mockImplementation((fn) => fn("access-token-1"));
      mockedFetch.mockRejectedValueOnce(
        new GraphQLRequestError("gone", "BAD_USER_INPUT", "CARD_NOT_FOUND"),
      );

      const result = await payOrderAction(initialState, savedInput);

      expect(result).toEqual({ reason: "CARD_NOT_FOUND" });
      expect(redirect).not.toHaveBeenCalled();
    });

    it("returns CARD_NOT_FOUND without a server refresh (CHKINT-08)", async () => {
      mockedWithAccessToken.mockImplementation((fn) => fn("access-token-1"));
      mockedFetch.mockRejectedValueOnce(
        new GraphQLRequestError("gone", "BAD_USER_INPUT", "CARD_NOT_FOUND"),
      );

      const result = await payOrderAction(initialState, savedInput);

      expect(result).toStrictEqual({ reason: "CARD_NOT_FOUND" });
      expect(refresh).not.toHaveBeenCalled();
    });

    it("does not refresh on other failures", async () => {
      mockedWithAccessToken.mockImplementation((fn) => fn("access-token-1"));
      mockedFetch.mockRejectedValueOnce(
        new GraphQLRequestError("declined", "BAD_USER_INPUT", "CARD_DECLINED"),
      );

      await payOrderAction(initialState, savedInput);

      expect(refresh).not.toHaveBeenCalled();
    });

    it("passes CARD_DECLINED through (AC 10)", async () => {
      mockedWithAccessToken.mockImplementation((fn) => fn("access-token-1"));
      mockedFetch.mockRejectedValueOnce(
        new GraphQLRequestError("declined", "BAD_USER_INPUT", "CARD_DECLINED"),
      );

      const result = await payOrderAction(initialState, savedInput);

      expect(result).toEqual({ reason: "CARD_DECLINED" });
    });
  });

  describe("with a typed card and saveCard (CARD-09)", () => {
    it.each([true, false])(
      "sends the card with saveCard: %s as given",
      async (saveCard) => {
        mockedWithAccessToken.mockImplementation((fn) => fn("access-token-1"));
        mockedFetch.mockResolvedValueOnce({ payOrder: { id: "order-1" } });

        await expect(
          payOrderAction(initialState, { ...buildInput(), saveCard }),
        ).rejects.toBe(REDIRECT_ERROR);

        const [, variables] = mockedFetch.mock.calls[0];
        expect(variables).toStrictEqual({
          input: { orderId: "order-1", card: validCard, saveCard },
        });
      },
    );

    it("still validates the card first and makes no API call when it is invalid", async () => {
      const result = await payOrderAction(initialState, {
        ...buildInput({ number: "1", holder: "Jane Doe", expiry: "12/99", cvv: "999" }),
        saveCard: true,
      });

      expect(result).toEqual({
        reason: "INVALID_CARD",
        fields: { number: "Enter a valid card number" },
      });
      expect(mockedWithAccessToken).not.toHaveBeenCalled();
    });
  });

  describe("with a Stripe PaymentMethod id (GW-41)", () => {
    it("forwards only the id, without card fields or client-side card validation", async () => {
      mockedWithAccessToken.mockImplementation((fn) => fn("access-token-1"));
      mockedFetch.mockResolvedValueOnce({ payOrder: { id: "order-1" } });

      await expect(
        payOrderAction(initialState, {
          orderId: "order-1",
          paymentMethodId: "pm_123",
        }),
      ).rejects.toBe(REDIRECT_ERROR);

      const [document, variables] = mockedFetch.mock.calls[0];
      expect(document).toBe(PAY_ORDER);
      expect(variables).toMatchObject({
        input: { orderId: "order-1", paymentMethodId: "pm_123" },
      });
      expect(JSON.stringify(variables)).not.toMatch(/"(card|number|cvv)"/);
      expect(redirect).toHaveBeenCalledWith("/checkout/order-1/success");
    });

    it("forwards saveCard when asked to save the card", async () => {
      mockedWithAccessToken.mockImplementation((fn) => fn("access-token-1"));
      mockedFetch.mockResolvedValueOnce({ payOrder: { id: "order-1" } });

      await expect(
        payOrderAction(initialState, {
          orderId: "order-1",
          paymentMethodId: "pm_123",
          saveCard: true,
        }),
      ).rejects.toBe(REDIRECT_ERROR);

      expect(mockedFetch.mock.calls[0][1]).toMatchObject({
        input: { paymentMethodId: "pm_123", saveCard: true },
      });
    });

    it.each(["CARD_DECLINED", "AUTHENTICATION_FAILED", "SEATS_UNAVAILABLE"] as const)(
      "maps %s and the state never echoes the id",
      async (reason) => {
        mockedWithAccessToken.mockImplementation((fn) => fn("access-token-1"));
        mockedFetch.mockRejectedValueOnce(
          new GraphQLRequestError("failed", "BAD_USER_INPUT", reason),
        );

        const result = await payOrderAction(initialState, {
          orderId: "order-1",
          paymentMethodId: "pm_123",
        });

        expect(result).toEqual({ reason });
        expect(JSON.stringify(result)).not.toContain("pm_123");
      },
    );

    it("maps an unknown error to GENERIC without echoing the id", async () => {
      mockedWithAccessToken.mockImplementation((fn) => fn("access-token-1"));
      mockedFetch.mockRejectedValueOnce(new Error("boom"));

      const result = await payOrderAction(initialState, {
        orderId: "order-1",
        paymentMethodId: "pm_123",
      });

      expect(result).toEqual({ reason: "GENERIC" });
    });
  });
});
