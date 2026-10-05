import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  PayOrderMutation,
  PayOrderMutationVariables,
} from "@/types/__generated__/graphql";

// Charges the card and issues tickets on success (PAY-36..PAY-61). Selects
// every CheckoutOrder field the checkout pages need.
export const PAY_ORDER: TypedDocumentNode<
  PayOrderMutation,
  PayOrderMutationVariables
> = gql`
  mutation payOrder($input: PayOrderInput!) {
    payOrder(input: $input) {
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
