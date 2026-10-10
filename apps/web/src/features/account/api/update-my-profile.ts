import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  UpdateMyProfileMutation,
  UpdateMyProfileMutationVariables,
} from "@/types/__generated__/graphql";

// Full replacement of the caller's editable profile fields; an empty string
// clears an optional field (PROFILE-03).
export const UPDATE_MY_PROFILE: TypedDocumentNode<
  UpdateMyProfileMutation,
  UpdateMyProfileMutationVariables
> = gql`
  mutation updateMyProfile($input: UpdateMyProfileInput!) {
    updateMyProfile(input: $input) {
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
