import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  ResetPasswordMutation,
  ResetPasswordMutationVariables,
} from "@/types/__generated__/graphql";

export const RESET_PASSWORD: TypedDocumentNode<
  ResetPasswordMutation,
  ResetPasswordMutationVariables
> = gql`
  mutation resetPassword($input: ResetPasswordInput!) {
    resetPassword(input: $input)
  }
`;
