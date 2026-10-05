import "server-only";
import { redirect } from "next/navigation";
import { GraphQLRequestError, graphqlServerFetch } from "@/lib/graphql-server";
import { ME } from "@/features/auth/api/me";
import {
  readAccessToken,
  readRefreshToken,
} from "@/features/auth/api/session-cookies";
import { FIND_CHECKOUT_ORDER } from "@/features/checkout/api/find-checkout-order";
import { paths } from "@/config/paths";
import type { FindCheckoutOrderQuery, MeQuery } from "@/types/__generated__/graphql";

export interface CheckoutPageData {
  order: FindCheckoutOrderQuery["findCheckoutOrder"];
  user: MeQuery["me"];
}

// A protected Server Component page's data loader (AD-024). Missing access
// token: a refresh cookie sends the browser through the refresh route
// first, otherwise straight to /login. A rejected access token
// (UNAUTHENTICATED) is also sent through the refresh route - Server
// Components can't write cookies themselves.
export async function getCheckoutPageData(
  orderId: string,
  currentPath: string,
): Promise<CheckoutPageData> {
  const accessToken = await readAccessToken();

  if (!accessToken) {
    const refreshToken = await readRefreshToken();
    redirect(
      refreshToken
        ? paths.sessionRefresh.getHref(currentPath)
        : paths.login.getHref(currentPath),
    );
  }

  try {
    const [{ findCheckoutOrder }, { me }] = await Promise.all([
      graphqlServerFetch(
        FIND_CHECKOUT_ORDER,
        { input: { orderId } },
        { revalidate: 0, accessToken },
      ),
      graphqlServerFetch(ME, {}, { revalidate: 0, accessToken }),
    ]);

    return { order: findCheckoutOrder, user: me };
  } catch (error) {
    if (error instanceof GraphQLRequestError && error.code === "UNAUTHENTICATED") {
      redirect(paths.sessionRefresh.getHref(currentPath));
    }
    throw error;
  }
}
