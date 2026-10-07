import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  SetDefaultPaymentCardMutation,
  SetDefaultPaymentCardMutationVariables,
} from "@/types/__generated__/graphql";

// Makes the card the caller's only default and returns the whole ordered
// list (CARD-10 AC 4)
export const SET_DEFAULT_PAYMENT_CARD: TypedDocumentNode<
  SetDefaultPaymentCardMutation,
  SetDefaultPaymentCardMutationVariables
> = gql`
  mutation setDefaultPaymentCard($input: PaymentCardIdInput!) {
    setDefaultPaymentCard(input: $input) {
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
