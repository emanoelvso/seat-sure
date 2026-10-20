"use server";

import { redirect } from "next/navigation";
import { NO_SESSION, withAccessToken } from "@/features/auth/api/with-access-token";
import { GraphQLRequestError, graphqlServerFetch } from "@/lib/graphql-server";
import { CONFIRM_ORDER_PAYMENT } from "@/features/checkout/api/confirm-order-payment";
import {
  toPaymentAction,
  type PaymentAction,
} from "@/features/checkout/api/payment-action";
import { paths } from "@/config/paths";

export type ConfirmOrderPaymentReason =
  | "AUTHENTICATION_FAILED"
  | "ORDER_EXPIRED"
  | "SEATS_UNAVAILABLE"
  | "GENERIC";

// Paid, still waiting on the bank, or why the payment didn't go through
export type ConfirmOrderPaymentResult =
  | { paid: true }
  | { requiresAction: PaymentAction }
  | { reason: ConfirmOrderPaymentReason };

// The reasons the API can pass straight through (GW-27..GW-29). Anything
// else becomes GENERIC.
const PASSTHROUGH_REASONS = new Set<string>([
  "AUTHENTICATION_FAILED",
  "ORDER_EXPIRED",
  "SEATS_UNAVAILABLE",
]);

// GW-25..GW-29: asks the API to settle the paused order once the buyer is
// back from the challenge. Never carries a card or a client secret in a
// failure result.
export async function confirmOrderPaymentAction(
  orderId: string,
): Promise<ConfirmOrderPaymentResult> {
  let result;
  try {
    result = await withAccessToken((accessToken) =>
      graphqlServerFetch(
        CONFIRM_ORDER_PAYMENT,
        { input: { orderId } },
        { revalidate: 0, accessToken },
      ),
    );
  } catch (error) {
    if (
      error instanceof GraphQLRequestError &&
      error.reason &&
      PASSTHROUGH_REASONS.has(error.reason)
    ) {
      return { reason: error.reason as ConfirmOrderPaymentReason };
    }
    return { reason: "GENERIC" };
  }

  if (result === NO_SESSION) {
    redirect(paths.login.getHref(paths.checkout.getHref(orderId)));
  }

  const { status, paymentAction } = result.confirmOrderPayment;
  if (status === "PAID") {
    return { paid: true };
  }
  if (status === "REQUIRES_ACTION" && paymentAction) {
    return { requiresAction: toPaymentAction(paymentAction) };
  }
  if (status === "EXPIRED") {
    return { reason: "ORDER_EXPIRED" };
  }
  return { reason: "GENERIC" };
}
