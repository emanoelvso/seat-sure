import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  RequestPasswordResetMutation,
  RequestPasswordResetMutationVariables,
} from "@/types/__generated__/graphql";

export const REQUEST_PASSWORD_RESET: TypedDocumentNode<
  RequestPasswordResetMutation,
  RequestPasswordResetMutationVariables
> = gql`
  mutation requestPasswordReset($input: RequestPasswordResetInput!) {
    requestPasswordReset(input: $input) {
      codeSent
      resendAvailableAt
    }
  }
`;
