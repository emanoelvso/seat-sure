"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { NO_SESSION, withAccessToken } from "@/features/auth/api/with-access-token";
import { GraphQLRequestError, graphqlServerFetch } from "@/lib/graphql-server";
import { PAY_ORDER } from "@/features/checkout/api/pay-order";
import { cardSchema } from "@/utils/card-schema";
import { paths } from "@/config/paths";

type PayOrderReason =
  | "CARD_DECLINED"
  | "SEATS_UNAVAILABLE"
  | "ORDER_EXPIRED"
  | "INVALID_CARD"
  | "CARD_NOT_FOUND"
  | "GENERIC";

// The reasons the API can pass straight through as-is (PAY-50, PAY-51,
// PAY-61, CARD-08 AC 9). Anything else becomes GENERIC (PAY-53).
const PASSTHROUGH_REASONS = new Set<string>([
  "CARD_DECLINED",
  "SEATS_UNAVAILABLE",
  "ORDER_EXPIRED",
  "CARD_NOT_FOUND",
]);

export interface PayOrderState {
  reason?: PayOrderReason;
  fields?: Record<string, string>;
}

// A typed card (optionally saved after the payment, CARD-09) or a saved
// card's id (CARD-08).
export type PayOrderActionInput =
  | {
      orderId: string;
      card: {
        number: string;
        holder: string;
        expiry: string;
        cvv: string;
      };
      saveCard?: boolean;
    }
  | { orderId: string; savedCardId: string };

// PAY-36, PAY-48, PAY-50..53, PAY-61: client validation first (no API
// call on an invalid card), then withAccessToken(PAY_ORDER). The returned
// state never carries the card's number, CVV or expiry (PAY-36) - only the
// reason and, for INVALID_CARD, the field error messages. A saved card has
// nothing to validate here: the API checks it belongs to the caller.
export async function payOrderAction(
  _prevState: PayOrderState,
  input: PayOrderActionInput,
): Promise<PayOrderState> {
  let source;
  if ("savedCardId" in input) {
    source = { savedCardId: input.savedCardId };
  } else {
    const parsed = cardSchema.safeParse(input.card);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string" && !fields[field]) {
          fields[field] = issue.message;
        }
      }
      return { reason: "INVALID_CARD", fields };
    }
    source = { card: parsed.data, saveCard: input.saveCard };
  }

  let result;
  try {
    result = await withAccessToken((accessToken) =>
      graphqlServerFetch(
        PAY_ORDER,
        { input: { orderId: input.orderId, ...source } },
        { revalidate: 0, accessToken },
      ),
    );
  } catch (error) {
    if (error instanceof GraphQLRequestError && error.reason) {
      // CARD-08 AC 9: the saved card is gone; reload the page's card list.
      if (error.reason === "CARD_NOT_FOUND") refresh();
      if (PASSTHROUGH_REASONS.has(error.reason)) {
        return { reason: error.reason as PayOrderReason };
      }
      if (error.reason === "INVALID_CARD") {
        return { reason: "INVALID_CARD", fields: error.fields };
      }
    }
    return { reason: "GENERIC" };
  }

  if (result === NO_SESSION) {
    redirect(paths.login.getHref(paths.checkout.getHref(input.orderId)));
  }

  redirect(paths.checkoutSuccess.getHref(result.payOrder.id));
}
