"use server";

import { redirect } from "next/navigation";
import {
  NO_SESSION,
  withAccessToken,
} from "@/features/auth/api/with-access-token";
import { GraphQLRequestError, graphqlServerFetch } from "@/lib/graphql-server";
import { ADD_PAYMENT_METHOD } from "@/features/account/api/add-payment-method";
import type { AddPaymentCardState } from "@/features/account/api/add-payment-card-action";
import { paths } from "@/config/paths";

const DECLINED_ERROR = "This card was declined. Try another card.";
const LIMITED_ERROR = "Too many card attempts. Try again in 15 minutes.";
const GENERIC_ERROR = "Something went wrong. Please try again.";

// GW-41: saves a card Stripe.js already turned into a PaymentMethod. Only the
// `pm_...` id reaches the server - there are no card fields to validate here -
// and the returned state never echoes it.
export async function addPaymentMethodAction(
  _prevState: AddPaymentCardState,
  paymentMethodId: string,
): Promise<AddPaymentCardState> {
  let result;
  try {
    result = await withAccessToken((accessToken) =>
      graphqlServerFetch(
        ADD_PAYMENT_METHOD,
        { input: { paymentMethodId } },
        { revalidate: 0, accessToken },
      ),
    );
  } catch (error) {
    if (error instanceof GraphQLRequestError) {
      if (error.reason === "CARD_DECLINED") {
        return { status: "error", fieldErrors: {}, formError: DECLINED_ERROR };
      }
      if (error.reason === "CARD_ATTEMPTS_LIMITED") {
        return { status: "error", fieldErrors: {}, formError: LIMITED_ERROR };
      }
    }
    return { status: "error", fieldErrors: {}, formError: GENERIC_ERROR };
  }

  if (result === NO_SESSION) {
    redirect(paths.login.getHref(paths.accountPayment.getHref()));
  }

  return { status: "saved", cards: result.addPaymentMethod };
}
