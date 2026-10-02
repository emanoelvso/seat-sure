import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  ConfirmPasswordResetCodeMutation,
  ConfirmPasswordResetCodeMutationVariables,
} from "@/types/__generated__/graphql";

export const CONFIRM_PASSWORD_RESET_CODE: TypedDocumentNode<
  ConfirmPasswordResetCodeMutation,
  ConfirmPasswordResetCodeMutationVariables
> = gql`
  mutation confirmPasswordResetCode($input: ConfirmPasswordResetCodeInput!) {
    confirmPasswordResetCode(input: $input) {
      resetToken
      expiresAt
    }
  }
`;
