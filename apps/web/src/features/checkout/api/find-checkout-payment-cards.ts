import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  CheckoutPaymentCardsQuery,
  CheckoutPaymentCardsQueryVariables,
} from "@/types/__generated__/graphql";

// The caller's saved cards for the checkout picker, default first, then
// oldest saved first (CARD-07 AC 1)
export const CHECKOUT_PAYMENT_CARDS: TypedDocumentNode<
  CheckoutPaymentCardsQuery,
  CheckoutPaymentCardsQueryVariables
> = gql`
  query checkoutPaymentCards {
    myPaymentCards {
      id
      brand
      last4
      expMonth
      expYear
      holder
      isDefault
      expired
    }
  }
`;

export type CheckoutPaymentCard =
  CheckoutPaymentCardsQuery["myPaymentCards"][number];
