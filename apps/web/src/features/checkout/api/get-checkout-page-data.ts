import "server-only";
import { GraphQLRequestError, graphqlServerFetch } from "@/lib/graphql-server";
import { ME } from "@/features/auth/api/me";
import { protectedPageFetch } from "@/features/auth/api/protected-page-fetch";
import {
  CHECKOUT_PAYMENT_CARDS,
  type CheckoutPaymentCard,
} from "@/features/checkout/api/find-checkout-payment-cards";
import { FIND_CHECKOUT_ORDER } from "@/features/checkout/api/find-checkout-order";
import type { FindCheckoutOrderQuery, MeQuery } from "@/types/__generated__/graphql";

export interface CheckoutPageData {
  order: FindCheckoutOrderQuery["findCheckoutOrder"];
  user: MeQuery["me"];
  cards: CheckoutPaymentCard[];
}

const isUnauthenticated = (error: unknown) =>
  error instanceof GraphQLRequestError && error.code === "UNAUTHENTICATED";

// Saved cards load alongside the order and fail soft unless the session
// is rejected. Shared protected-page loading owns authentication redirects.
export async function getCheckoutPageData(
  orderId: string,
  currentPath: string,
): Promise<CheckoutPageData> {
  return protectedPageFetch(currentPath, async (accessToken) => {
    const [{ findCheckoutOrder }, { me }, cards] = await Promise.all([
      graphqlServerFetch(
        FIND_CHECKOUT_ORDER,
        { input: { orderId } },
        { revalidate: 0, accessToken },
      ),
      graphqlServerFetch(ME, {}, { revalidate: 0, accessToken }),
      graphqlServerFetch(
        CHECKOUT_PAYMENT_CARDS,
        {},
        { revalidate: 0, accessToken },
      ).then(
        ({ myPaymentCards }) => myPaymentCards,
        (error: unknown) => {
          if (isUnauthenticated(error)) throw error;
          return [];
        },
      ),
    ]);

    return { order: findCheckoutOrder, user: me, cards };
  });
}
