"use server";

import { redirect } from "next/navigation";
import {
  NO_SESSION,
  withAccessToken,
} from "@/features/auth/api/with-access-token";
import { GraphQLRequestError, graphqlServerFetch } from "@/lib/graphql-server";
import { ADD_PAYMENT_CARD } from "@/features/account/api/add-payment-card";
import type { PaymentCard } from "@/features/account/api/find-my-payment-cards";
import { cardSchema } from "@/utils/card-schema";
import type { CardInput } from "@/utils/card";
import { paths } from "@/config/paths";

const DECLINED_ERROR = "This card was declined. Try another card.";
const LIMITED_ERROR = "Too many card attempts. Try again in 15 minutes.";
const GENERIC_ERROR = "Something went wrong. Please try again.";

export type AddPaymentCardState =
  | { status: "idle"; fieldErrors: Record<string, string> }
  | { status: "saved"; cards: PaymentCard[] }
  | {
      status: "error";
      fieldErrors: Record<string, string>;
      formError?: string;
    };

// CARD-04..06: the card rules run first (no API call on an invalid card),
// then withAccessToken(ADD_PAYMENT_CARD), which refreshes the session once
// and retries. The returned state never carries the card's number or CVV,
// only messages or the saved list.
export async function addPaymentCardAction(
  _prevState: AddPaymentCardState,
  card: CardInput,
): Promise<AddPaymentCardState> {
  const parsed = cardSchema.safeParse(card);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string" && !fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    return { status: "error", fieldErrors };
  }

  let result;
  try {
    result = await withAccessToken((accessToken) =>
      graphqlServerFetch(
        ADD_PAYMENT_CARD,
        { input: parsed.data },
        { revalidate: 0, accessToken },
      ),
    );
  } catch (error) {
    if (error instanceof GraphQLRequestError) {
      if (
        (error.reason === "INVALID_CARD" ||
          error.reason === "DUPLICATE_CARD") &&
        error.fields
      ) {
        return { status: "error", fieldErrors: error.fields };
      }
      if (error.reason === "CARD_DECLINED") {
        return { status: "error", fieldErrors: {}, formError: DECLINED_ERROR };
      }
      // CARDABUSE-03 AC 1: locked after too many failed attempts.
      if (error.reason === "CARD_ATTEMPTS_LIMITED") {
        return { status: "error", fieldErrors: {}, formError: LIMITED_ERROR };
      }
    }
    return { status: "error", fieldErrors: {}, formError: GENERIC_ERROR };
  }

  if (result === NO_SESSION) {
    redirect(paths.login.getHref(paths.accountPayment.getHref()));
  }

  return { status: "saved", cards: result.addPaymentCard };
}
