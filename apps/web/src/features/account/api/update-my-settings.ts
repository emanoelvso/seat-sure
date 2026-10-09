import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  UpdateMySettingsMutation,
  UpdateMySettingsMutationVariables,
} from "@/types/__generated__/graphql";

export const UPDATE_MY_SETTINGS: TypedDocumentNode<
  UpdateMySettingsMutation,
  UpdateMySettingsMutationVariables
> = gql`
  mutation UpdateMySettings($input: UpdateMySettingsInput!) {
    updateMySettings(input: $input) {
      eventReminders
      exclusiveOffers
      ticketAvailability
      emailNotifications
      pushNotifications
      language
    }
  }
`;
