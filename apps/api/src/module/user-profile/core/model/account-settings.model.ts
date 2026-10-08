import { z } from 'zod';

export const settingsPatchSchema = z
  .object({
    eventReminders: z.boolean().optional(),
    exclusiveOffers: z.boolean().optional(),
    ticketAvailability: z.boolean().optional(),
    emailNotifications: z.boolean().optional(),
    pushNotifications: z.boolean().optional(),
    language: z.enum(['en', 'pt-BR']).optional(),
  })
  .strict()
  .refine(
    (patch) =>
      Object.values(patch).filter((value) => value !== undefined).length === 1,
  );

export interface AccountSettingsModel {
  eventReminders: boolean;
  exclusiveOffers: boolean;
  ticketAvailability: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  language: 'en' | 'pt-BR';
}
