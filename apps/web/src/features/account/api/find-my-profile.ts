import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  MyProfileQuery,
  MyProfileQueryVariables,
} from "@/types/__generated__/graphql";

// The signed-in user's own profile, identified by the session (PROFILE-01,
// PROFILE-02). Optional fields are null when unset.
export const MY_PROFILE: TypedDocumentNode<
  MyProfileQuery,
  MyProfileQueryVariables
> = gql`
  query myProfile {
    myProfile {
      id
      firstName
      lastName
      avatarUrl
      state
      city
      birthDate
      phoneCountryCode
      phoneNumber
      zipCode
    }
  }
`;

export type MyProfile = MyProfileQuery["myProfile"];
