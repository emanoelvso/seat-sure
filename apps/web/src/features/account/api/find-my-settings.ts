import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  MySettingsQuery,
  MySettingsQueryVariables,
} from "@/types/__generated__/graphql";

export const MY_SETTINGS: TypedDocumentNode<
  MySettingsQuery,
  MySettingsQueryVariables
> = gql`
  query MySettings {
    mySettings {
      eventReminders
      exclusiveOffers
      ticketAvailability
      emailNotifications
      pushNotifications
      language
    }
  }
`;

export type MySettings = MySettingsQuery["mySettings"];
