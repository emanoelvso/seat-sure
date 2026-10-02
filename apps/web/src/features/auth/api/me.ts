import { gql, type TypedDocumentNode } from "@apollo/client";
import type { MeQuery, MeQueryVariables } from "@/types/__generated__/graphql";

export const ME: TypedDocumentNode<MeQuery, MeQueryVariables> = gql`
  query me {
    me {
      id
      email
      firstName
      lastName
      avatarUrl
    }
  }
`;
