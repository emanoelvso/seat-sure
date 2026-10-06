import "server-only";
import { graphqlServerFetch } from "@/lib/graphql-server";
import { FIND_ACCOUNT_ORDER } from "@/features/account/api/find-account-order";
import { ME } from "@/features/auth/api/me";
import { protectedPageFetch } from "@/features/auth/api/protected-page-fetch";

// The order and the signed-in user ("Paid by") for the detail page. The order
// is null when it is unknown, foreign, pending, expired or failed
// (ORDDETAIL-04); the page turns that into notFound().
export async function getAccountOrderPageData(
  orderId: string,
  currentPath: string,
) {
  return protectedPageFetch(currentPath, async (accessToken) => {
    const options = { revalidate: 0, accessToken };
    const [{ findAccountOrder }, { me }] = await Promise.all([
      graphqlServerFetch(FIND_ACCOUNT_ORDER, { input: { orderId } }, options),
      graphqlServerFetch(ME, {}, options),
    ]);

    return { order: findAccountOrder, user: me };
  });
}
