import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  VerifyEmailMutation,
  VerifyEmailMutationVariables,
} from "@/types/__generated__/graphql";

export const VERIFY_EMAIL: TypedDocumentNode<
  VerifyEmailMutation,
  VerifyEmailMutationVariables
> = gql`
  mutation verifyEmail($input: VerifyEmailInput!) {
    verifyEmail(input: $input) {
      accessToken
      refreshToken
      expiresAt
      persistent
    }
  }
`;
