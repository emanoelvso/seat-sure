"use server";

import { redirect } from "next/navigation";
import {
  NO_SESSION,
  withAccessToken,
} from "@/features/auth/api/with-access-token";
import { GraphQLRequestError, graphqlServerFetch } from "@/lib/graphql-server";
import {
  MY_PAYMENT_CARDS,
  type PaymentCard,
} from "@/features/account/api/find-my-payment-cards";
import { REMOVE_PAYMENT_CARD } from "@/features/account/api/remove-payment-card";
import { SET_DEFAULT_PAYMENT_CARD } from "@/features/account/api/set-default-payment-card";
import { paths } from "@/config/paths";

const GENERIC_ERROR = "Something went wrong. Please try again.";

export type PaymentCardActionResult =
  | { cards: PaymentCard[] }
  | { notFound: true; cards: PaymentCard[] }
  | { error: string };

// Runs one card mutation with the session refreshed once on UNAUTHENTICATED.
// CARD_NOT_FOUND answers with a fresh list so the page reloads it (CARD-11
// AC 10); any other failure is the generic error and the page keeps its list
// (AC 11).
async function runCardMutation(
  mutate: (accessToken: string) => Promise<PaymentCard[]>,
): Promise<PaymentCardActionResult> {
  let result;
  try {
    result = await withAccessToken(async (accessToken) => {
      try {
        return { cards: await mutate(accessToken) };
      } catch (error) {
        if (
          !(error instanceof GraphQLRequestError) ||
          error.reason !== "CARD_NOT_FOUND"
        ) {
          throw error;
        }
        const { myPaymentCards } = await graphqlServerFetch(
          MY_PAYMENT_CARDS,
          {},
          { revalidate: 0, accessToken },
        );
        return { notFound: true as const, cards: myPaymentCards };
      }
    });
  } catch {
    return { error: GENERIC_ERROR };
  }

  if (result === NO_SESSION) {
    redirect(paths.login.getHref(paths.accountPayment.getHref()));
  }

  return result;
}

// CARD-10 AC 4: makes the card the caller's only default
export async function setDefaultPaymentCardAction(
  cardId: string,
): Promise<PaymentCardActionResult> {
  return runCardMutation(async (accessToken) => {
    const { setDefaultPaymentCard } = await graphqlServerFetch(
      SET_DEFAULT_PAYMENT_CARD,
      { input: { id: cardId } },
      { revalidate: 0, accessToken },
    );
    return setDefaultPaymentCard;
  });
}

// CARD-10 AC 7, 8: removes the card; the API promotes a new default
export async function removePaymentCardAction(
  cardId: string,
): Promise<PaymentCardActionResult> {
  return runCardMutation(async (accessToken) => {
    const { removePaymentCard } = await graphqlServerFetch(
      REMOVE_PAYMENT_CARD,
      { input: { id: cardId } },
      { revalidate: 0, accessToken },
    );
    return removePaymentCard;
  });
}
