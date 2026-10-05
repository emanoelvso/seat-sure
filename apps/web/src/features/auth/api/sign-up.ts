import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  SignUpMutation,
  SignUpMutationVariables,
} from "@/types/__generated__/graphql";

export const SIGN_UP: TypedDocumentNode<
  SignUpMutation,
  SignUpMutationVariables
> = gql`
  mutation signUp($input: SignUpInput!) {
    signUp(input: $input) {
      email
      codeSent
      resendAvailableAt
    }
  }
`;
