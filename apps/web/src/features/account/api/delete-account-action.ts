"use server";

import { redirect } from "next/navigation";
import {
  NO_SESSION,
  withAccessToken,
} from "@/features/auth/api/with-access-token";
import { clearSessionCookies } from "@/features/auth/api/session-cookies";
import { GraphQLRequestError, graphqlServerFetch } from "@/lib/graphql-server";
import { DELETE_MY_ACCOUNT } from "@/features/account/api/delete-my-account";
import { paths } from "@/config/paths";

const ACTIVE_ORDERS_MESSAGE =
  "You can't delete your account while you have an order in progress or tickets for an upcoming event.";
const GENERIC_ERROR = "Something went wrong. Please try again.";

export type DeleteAccountResult = { error: string };

// Deletes the signed-in user's account. On success the session cookies are
// cleared and the user lands on the home page, which shows the notice.
export async function deleteAccountAction(
  confirmation: string,
): Promise<DeleteAccountResult> {
  let result;
  try {
    result = await withAccessToken((accessToken) =>
      graphqlServerFetch(
        DELETE_MY_ACCOUNT,
        { input: { confirmation } },
        { revalidate: 0, accessToken },
      ),
    );
  } catch (error) {
    if (
      error instanceof GraphQLRequestError &&
      error.reason === "ACCOUNT_HAS_ACTIVE_ORDERS"
    ) {
      return { error: ACTIVE_ORDERS_MESSAGE };
    }
    return { error: GENERIC_ERROR };
  }

  if (result === NO_SESSION) {
    redirect(paths.login.getHref(paths.accountSettings.getHref()));
  }

  await clearSessionCookies();
  redirect(`${paths.home.getHref()}?accountDeleted=1`);
}
