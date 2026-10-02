import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  LogInMutation,
  LogInMutationVariables,
} from "@/types/__generated__/graphql";

export const LOG_IN: TypedDocumentNode<
  LogInMutation,
  LogInMutationVariables
> = gql`
  mutation logIn($input: LogInInput!) {
    logIn(input: $input) {
      status
      codeSent
      resendAvailableAt
      session {
        accessToken
        refreshToken
        expiresAt
        persistent
      }
    }
  }
`;
