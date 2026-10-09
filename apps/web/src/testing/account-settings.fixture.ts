import type { MySettingsQuery } from "@/types/__generated__/graphql";

export const ACCOUNT_SETTINGS: MySettingsQuery["mySettings"] = {
  __typename: "AccountSettings",
  eventReminders: false,
  exclusiveOffers: true,
  ticketAvailability: false,
  emailNotifications: true,
  pushNotifications: false,
  language: "en",
};
