import { beforeEach, describe, expect, it, vi } from "vitest";
import { graphqlServerFetch } from "@/lib/graphql-server";
import { protectedPageFetch } from "@/features/auth/api/protected-page-fetch";
import { ME } from "@/features/auth/api/me";
import { FIND_ACCOUNT_ORDER } from "@/features/account/api/find-account-order";
import { getAccountOrderPageData } from "@/features/account/api/get-account-order-page-data";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/graphql-server");
vi.mock("@/features/auth/api/protected-page-fetch", () => ({
  protectedPageFetch: vi.fn(
    (_path: string, fn: (token: string) => Promise<unknown>) =>
      fn("access-token-1"),
  ),
}));

const mockedFetch = vi.mocked(graphqlServerFetch);

const user = {
  __typename: "CurrentUser" as const,
  id: "user-1",
  email: "a@example.com",
  firstName: "Negar",
  lastName: "Khosravi",
  avatarUrl: null,
};

const order = { __typename: "AccountOrderDetail" as const, id: "o1" };

function mockResponses(findAccountOrder: unknown) {
  mockedFetch.mockImplementation((async (document: unknown) => {
    if (document === FIND_ACCOUNT_ORDER) return { findAccountOrder };
    if (document === ME) return { me: user };
    throw new Error("unexpected document");
  }) as unknown as typeof graphqlServerFetch);
}

describe("getAccountOrderPageData", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it("fetches the order and the user with the token and revalidate: 0 (ORDDETAIL-04)", async () => {
    mockResponses(order);

    const result = await getAccountOrderPageData("o1", "/account/tickets/o1");

    expect(result).toEqual({ order, user });
    expect(mockedFetch).toHaveBeenCalledWith(
      FIND_ACCOUNT_ORDER,
      { input: { orderId: "o1" } },
      { revalidate: 0, accessToken: "access-token-1" },
    );
    expect(mockedFetch).toHaveBeenCalledWith(
      ME,
      {},
      { revalidate: 0, accessToken: "access-token-1" },
    );
    expect(protectedPageFetch).toHaveBeenCalledWith(
      "/account/tickets/o1",
      expect.any(Function),
    );
  });

  it("passes a null order through so the page can call notFound() (ORDDETAIL-04)", async () => {
    mockResponses(null);

    const result = await getAccountOrderPageData("x", "/account/tickets/x");

    expect(result).toEqual({ order: null, user });
  });
});
