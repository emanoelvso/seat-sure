import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  FindCheckoutOrderQuery,
  FindCheckoutOrderQueryVariables,
} from "@/types/__generated__/graphql";

// Reloads a pending/paid order for its owner (PAY-22, PAY-23). Selects
// every CheckoutOrder field the checkout pages need.
export const FIND_CHECKOUT_ORDER: TypedDocumentNode<
  FindCheckoutOrderQuery,
  FindCheckoutOrderQueryVariables
> = gql`
  query findCheckoutOrder($input: FindCheckoutOrderInput!) {
    findCheckoutOrder(input: $input) {
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
