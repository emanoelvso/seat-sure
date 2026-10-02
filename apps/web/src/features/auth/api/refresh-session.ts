import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  RefreshSessionMutation,
  RefreshSessionMutationVariables,
} from "@/types/__generated__/graphql";

export const REFRESH_SESSION: TypedDocumentNode<
  RefreshSessionMutation,
  RefreshSessionMutationVariables
> = gql`
  mutation refreshSession($input: RefreshSessionInput!) {
    refreshSession(input: $input) {
      accessToken
      refreshToken
      expiresAt
      persistent
    }
  }
`;
