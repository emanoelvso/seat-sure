import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  RemovePaymentCardMutation,
  RemovePaymentCardMutationVariables,
} from "@/types/__generated__/graphql";

// Deletes the card and returns the remaining ordered list (CARD-10 AC 7, 8)
export const REMOVE_PAYMENT_CARD: TypedDocumentNode<
  RemovePaymentCardMutation,
  RemovePaymentCardMutationVariables
> = gql`
  mutation removePaymentCard($input: PaymentCardIdInput!) {
    removePaymentCard(input: $input) {
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
