import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  DeleteMyAccountMutation,
  DeleteMyAccountMutationVariables,
} from "@/types/__generated__/graphql";

// Deletes the caller's account; the API refuses while an order or upcoming
// ticket is open (ACCOUNT_HAS_ACTIVE_ORDERS)
export const DELETE_MY_ACCOUNT: TypedDocumentNode<
  DeleteMyAccountMutation,
  DeleteMyAccountMutationVariables
> = gql`
  mutation DeleteMyAccount($input: DeleteMyAccountInput!) {
    deleteMyAccount(input: $input)
  }
`;
