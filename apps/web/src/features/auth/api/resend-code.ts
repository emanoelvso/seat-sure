import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  ResendCodeMutation,
  ResendCodeMutationVariables,
} from "@/types/__generated__/graphql";

export const RESEND_CODE: TypedDocumentNode<
  ResendCodeMutation,
  ResendCodeMutationVariables
> = gql`
  mutation resendCode($input: ResendCodeInput!) {
    resendCode(input: $input) {
      codeSent
      resendAvailableAt
    }
  }
`;
