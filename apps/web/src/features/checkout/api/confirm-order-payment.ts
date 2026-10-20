import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  ConfirmOrderPaymentMutation,
  ConfirmOrderPaymentMutationVariables,
} from "@/types/__generated__/graphql";

// Settles a paused order after its 3-D Secure challenge (GW-09..GW-15): PAID,
// or the same challenge while the bank hasn't answered yet.
export const CONFIRM_ORDER_PAYMENT: TypedDocumentNode<
  ConfirmOrderPaymentMutation,
  ConfirmOrderPaymentMutationVariables
> = gql`
  mutation confirmOrderPayment($input: ConfirmOrderPaymentInput!) {
    confirmOrderPayment(input: $input) {
      id
      status
      paymentAction {
        provider
        clientSecret
      }
    }
  }
`;
