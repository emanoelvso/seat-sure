export interface AccountSettingsModel {
  eventReminders: boolean;
  exclusiveOffers: boolean;
  ticketAvailability: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  language: 'en' | 'pt-BR';
}
