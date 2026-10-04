import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  StartCheckoutMutation,
  StartCheckoutMutationVariables,
} from "@/types/__generated__/graphql";

// Locks the picked seats into a pending order (PAY-05..PAY-16). Selects
// every CheckoutOrder field the checkout pages need.
export const START_CHECKOUT: TypedDocumentNode<
  StartCheckoutMutation,
  StartCheckoutMutationVariables
> = gql`
  mutation startCheckout($input: StartCheckoutInput!) {
    startCheckout(input: $input) {
      id
      status
      expiresAt
      secondsLeft
      quantity
      currency
      subtotalCents
      serviceFeeCents
      taxCents
      totalCents
      unitPriceCents
      unitServiceFeeCents
      unitTaxCents
      event {
        id
        name
        coverImage
        venue
        city
        country
        startAt
      }
      ticketType {
        id
        name
      }
      items {
        seatId
        row
        number
      }
    }
  }
`;
