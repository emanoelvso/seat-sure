import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  DemoSignInMutation,
  DemoSignInMutationVariables,
} from "@/types/__generated__/graphql";

export const DEMO_SIGN_IN: TypedDocumentNode<
  DemoSignInMutation,
  DemoSignInMutationVariables
> = gql`
  mutation demoSignIn {
    demoSignIn {
      accessToken
      refreshToken
      expiresAt
      persistent
    }
  }
`;
