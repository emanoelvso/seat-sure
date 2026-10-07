import "server-only";
import { graphqlServerFetch } from "@/lib/graphql-server";
import { MY_PAYMENT_CARDS } from "@/features/account/api/find-my-payment-cards";
import { protectedPageFetch } from "@/features/auth/api/protected-page-fetch";

// The signed-in user's saved cards for the payment page (CARD-01, CARD-02).
// Any error other than UNAUTHENTICATED is rethrown to the account route
// error boundary.
export async function getPaymentPageData(currentPath: string) {
  return protectedPageFetch(currentPath, async (accessToken) => {
    const { myPaymentCards } = await graphqlServerFetch(
      MY_PAYMENT_CARDS,
      {},
      { revalidate: 0, accessToken },
    );

    return { cards: myPaymentCards };
  });
}
