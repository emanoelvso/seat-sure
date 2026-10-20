import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { GraphQLRequestError, graphqlServerFetch } from "@/lib/graphql-server";
import { NO_SESSION, withAccessToken } from "@/features/auth/api/with-access-token";
import { CONFIRM_ORDER_PAYMENT } from "@/features/checkout/api/confirm-order-payment";
import { confirmOrderPaymentAction } from "@/features/checkout/api/confirm-order-payment-action";

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

const answer = (confirmOrderPayment: Record<string, unknown>) =>
  mockedFetch.mockResolvedValueOnce({ confirmOrderPayment } as never);

describe("confirmOrderPaymentAction", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
    mockedWithAccessToken.mockReset();
    mockedWithAccessToken.mockImplementation((fn) => fn("access-token-1"));
    vi.mocked(redirect).mockClear();
  });

  it("confirms the order with the session's token and reports PAID as paid (GW-26)", async () => {
    answer({ id: "order-1", status: "PAID", paymentAction: null });

    const result = await confirmOrderPaymentAction("order-1");

    expect(result).toEqual({ paid: true });
    expect(mockedFetch).toHaveBeenCalledWith(
      CONFIRM_ORDER_PAYMENT,
      { input: { orderId: "order-1" } },
      { revalidate: 0, accessToken: "access-token-1" },
    );
  });

  it("returns the payment action while the bank hasn't answered (GW-11)", async () => {
    answer({
      id: "order-1",
      status: "REQUIRES_ACTION",
      paymentAction: { provider: "simulated", clientSecret: "sim_secret_abc" },
    });

    const result = await confirmOrderPaymentAction("order-1");

    expect(result).toEqual({
      requiresAction: { provider: "simulated", clientSecret: "sim_secret_abc" },
    });
  });

  it.each(["AUTHENTICATION_FAILED", "ORDER_EXPIRED", "SEATS_UNAVAILABLE"] as const)(
    "passes %s through as the reason (GW-27, GW-28, GW-29)",
    async (reason) => {
      mockedFetch.mockRejectedValueOnce(
        new GraphQLRequestError("failed", "BAD_USER_INPUT", reason),
      );

      const result = await confirmOrderPaymentAction("order-1");

      expect(result).toEqual({ reason });
    },
  );

  it.each(["ORDER_NOT_FOUND", "PAYMENT_IN_PROGRESS", "CARD_DECLINED"])(
    "maps the other reason %s to GENERIC",
    async (reason) => {
      mockedFetch.mockRejectedValueOnce(
        new GraphQLRequestError("failed", "BAD_USER_INPUT", reason),
      );

      const result = await confirmOrderPaymentAction("order-1");

      expect(result).toEqual({ reason: "GENERIC" });
    },
  );

  it("maps an error without a reason to GENERIC", async () => {
    mockedFetch.mockRejectedValueOnce(new Error("network down"));

    const result = await confirmOrderPaymentAction("order-1");

    expect(result).toEqual({ reason: "GENERIC" });
  });

  it("reads an order that expired as ORDER_EXPIRED, and any other status as GENERIC", async () => {
    answer({ id: "order-1", status: "EXPIRED", paymentAction: null });
    answer({ id: "order-1", status: "PENDING", paymentAction: null });

    expect(await confirmOrderPaymentAction("order-1")).toEqual({
      reason: "ORDER_EXPIRED",
    });
    expect(await confirmOrderPaymentAction("order-1")).toEqual({
      reason: "GENERIC",
    });
  });

  it("redirects to /login with the checkout URL as redirectTo on NO_SESSION (PAY-03)", async () => {
    mockedWithAccessToken.mockResolvedValue(NO_SESSION);

    await expect(confirmOrderPaymentAction("order-1")).rejects.toBe(
      REDIRECT_ERROR,
    );

    expect(redirect).toHaveBeenCalledWith(
      "/login?redirectTo=%2Fcheckout%2Forder-1",
    );
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("never puts the client secret in a failure result", async () => {
    mockedFetch.mockRejectedValueOnce(
      new GraphQLRequestError("failed", "BAD_USER_INPUT", "AUTHENTICATION_FAILED"),
    );

    const result = await confirmOrderPaymentAction("order-1");

    expect(JSON.stringify(result)).not.toContain("secret");
  });
});
