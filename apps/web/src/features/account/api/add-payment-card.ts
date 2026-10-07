import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  AddPaymentCardMutation,
  AddPaymentCardMutationVariables,
} from "@/types/__generated__/graphql";

// Saves a card for the caller and returns the whole ordered list
// (CARD-03, CARD-04, CARD-05)
export const ADD_PAYMENT_CARD: TypedDocumentNode<
  AddPaymentCardMutation,
  AddPaymentCardMutationVariables
> = gql`
  mutation addPaymentCard($input: AddPaymentCardInput!) {
    addPaymentCard(input: $input) {
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
