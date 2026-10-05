"use server";

import { redirect } from "next/navigation";
import { NO_SESSION, withAccessToken } from "@/features/auth/api/with-access-token";
import { GraphQLRequestError, graphqlServerFetch } from "@/lib/graphql-server";
import { START_CHECKOUT } from "@/features/checkout/api/start-checkout";
import { paths } from "@/config/paths";

export interface StartCheckoutState {
  error?: "SEATS_UNAVAILABLE" | "GENERIC";
}

export interface StartCheckoutActionInput {
  eventId: string;
  ticketTypeId: string;
  seatIds: string[];
}

// PAY-16, PAY-17, PAY-03: locks the picked seats into a pending order, then
// navigates to it. A signed-out fan is sent to /login with the checkout
// start URL as the return path, following AD-019's reason -> copy mapping
// (log-in-action.ts).
export async function startCheckoutAction(
  _prevState: StartCheckoutState,
  input: StartCheckoutActionInput,
): Promise<StartCheckoutState> {
  let result;
  try {
    result = await withAccessToken((accessToken) =>
      graphqlServerFetch(
        START_CHECKOUT,
        {
          input: {
            eventId: input.eventId,
            ticketTypeId: input.ticketTypeId,
            seatIds: input.seatIds,
          },
        },
        { revalidate: 0, accessToken },
      ),
    );
  } catch (error) {
    if (error instanceof GraphQLRequestError && error.reason === "SEATS_UNAVAILABLE") {
      return { error: "SEATS_UNAVAILABLE" };
    }
    return { error: "GENERIC" };
  }

  if (result === NO_SESSION) {
    redirect(
      paths.login.getHref(
        paths.checkoutStart.getHref(
          input.eventId,
          input.ticketTypeId,
          input.seatIds,
        ),
      ),
    );
  }

  redirect(paths.checkout.getHref(result.startCheckout.id));
}
