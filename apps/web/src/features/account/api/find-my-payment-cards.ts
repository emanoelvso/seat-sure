import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  MyPaymentCardsQuery,
  MyPaymentCardsQueryVariables,
} from "@/types/__generated__/graphql";

// The signed-in user's saved cards, default first, then oldest saved first
// (CARD-01 AC 3, CARD-02 AC 9). Never a token or a fingerprint.
export const MY_PAYMENT_CARDS: TypedDocumentNode<
  MyPaymentCardsQuery,
  MyPaymentCardsQueryVariables
> = gql`
  query myPaymentCards {
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

export type PaymentCard = MyPaymentCardsQuery["myPaymentCards"][number];
