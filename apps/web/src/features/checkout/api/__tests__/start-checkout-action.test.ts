import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { GraphQLRequestError, graphqlServerFetch } from "@/lib/graphql-server";
import { NO_SESSION, withAccessToken } from "@/features/auth/api/with-access-token";
import { START_CHECKOUT } from "@/features/checkout/api/start-checkout";
import {
  startCheckoutAction,
  type StartCheckoutState,
} from "@/features/checkout/api/start-checkout-action";

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

const initialState: StartCheckoutState = {};
const input = {
  eventId: "e1",
  ticketTypeId: "t1",
  seatIds: ["s2", "s1"],
};

async function expectRedirectTo(target: string) {
  await expect(startCheckoutAction(initialState, input)).rejects.toBe(
    REDIRECT_ERROR,
  );
  expect(redirect).toHaveBeenCalledWith(target);
}

describe("startCheckoutAction", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
    mockedWithAccessToken.mockReset();
    vi.mocked(redirect).mockClear();
  });

  it("navigates to /checkout/{orderId} on success, preserving seat id order (PAY-16)", async () => {
    mockedWithAccessToken.mockImplementation((fn) => fn("access-token-1"));
    mockedFetch.mockResolvedValueOnce({ startCheckout: { id: "order-1" } });

    await expectRedirectTo("/checkout/order-1");

    expect(mockedFetch).toHaveBeenCalledWith(
      START_CHECKOUT,
      {
        input: { eventId: "e1", ticketTypeId: "t1", seatIds: ["s2", "s1"] },
      },
      { revalidate: 0, accessToken: "access-token-1" },
    );
  });

  it("answers { error: 'SEATS_UNAVAILABLE' } when the API reports the reason (PAY-17)", async () => {
    mockedWithAccessToken.mockImplementation((fn) => fn("access-token-1"));
    mockedFetch.mockRejectedValueOnce(
      new GraphQLRequestError(
        "Seats unavailable",
        "BAD_USER_INPUT",
        "SEATS_UNAVAILABLE",
      ),
    );

    const result = await startCheckoutAction(initialState, input);

    expect(result).toEqual({ error: "SEATS_UNAVAILABLE" });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("redirects to /login with the checkout start URL as redirectTo on NO_SESSION (PAY-03)", async () => {
    mockedWithAccessToken.mockResolvedValue(NO_SESSION);

    await expectRedirectTo(
      "/login?redirectTo=%2Fevents%2Fe1%2Ftickets%2Ft1%2Fcheckout%3Fseats%3Ds2%2Cs1",
    );
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("answers { error: 'GENERIC' } for any other error", async () => {
    mockedWithAccessToken.mockImplementation((fn) => fn("access-token-1"));
    mockedFetch.mockRejectedValueOnce(new Error("boom"));

    const result = await startCheckoutAction(initialState, input);

    expect(result).toEqual({ error: "GENERIC" });
    expect(redirect).not.toHaveBeenCalled();
  });
});
