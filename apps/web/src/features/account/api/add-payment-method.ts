import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  AddPaymentMethodMutation,
  AddPaymentMethodMutationVariables,
} from "@/types/__generated__/graphql";

// Saves a card the browser already tokenized with Stripe (GW-41) and returns
// the whole ordered list, like addPaymentCard
export const ADD_PAYMENT_METHOD: TypedDocumentNode<
  AddPaymentMethodMutation,
  AddPaymentMethodMutationVariables
> = gql`
  mutation addPaymentMethod($input: AddPaymentMethodInput!) {
    addPaymentMethod(input: $input) {
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
