import { tz } from "@date-fns/tz";
import { format } from "date-fns";
import { z } from "zod";
import { env } from "@/config/env";

// Mirrors apps/api/src/module/user-profile/core/model/profile-rules.model.ts
// so the client surfaces the same messages before the API round-trip. The
// API stays authoritative (PROFILE-04).
const MAX_NAME_LENGTH = 50;
const MAX_PLACE_LENGTH = 50;
const MIN_BIRTH_DATE = "1900-01-01";
const DEFAULT_PHONE_COUNTRY_CODE = "+1";

const ZIP_CODE_PATTERN = /^[A-Za-z0-9 -]{3,10}$/;
const PHONE_NUMBER_PATTERN = /^\d{4,14}$/;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

// In the order the phone code menu lists them (PROFILE-07). `country` keys
// the flag icon.
export const PHONE_COUNTRY_CODES = [
  { code: "+1", country: "us" },
  { code: "+49", country: "de" },
  { code: "+34", country: "es" },
  { code: "+33", country: "fr" },
] as const;

export type PhoneCountry = (typeof PHONE_COUNTRY_CODES)[number]["country"];

export interface PersonalInfoValues {
  firstName: string;
  lastName: string;
  state: string;
  city: string;
  // 'YYYY-MM-DD' or ''.
  birthDate: string;
  phoneCountryCode: string;
  phoneNumber: string;
  zipCode: string;
}

export interface PersonalInfoFormState {
  status: "idle" | "saved" | "error";
  // Set on success: the stored values.
  saved?: PersonalInfoValues;
  // Keys as the API's, plus "phone" for the code and number together.
  fieldErrors: Record<string, string>;
  formError?: string;
}

function isCalendarDate(value: string): boolean {
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return false;
  const [year, month, day] = [match[1], match[2], match[3]].map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

// Today's calendar date in the app time zone; ISO dates compare as strings.
function todayInAppTimeZone(): string {
  return format(new Date(), "yyyy-MM-dd", { in: tz(env.timeZone) });
}

// Each field is checked on its own so every message is returned at once.
// The output is the normalized value the API stores: trimmed text and a
// phone number reduced to its digits.
export const personalInfoSchema = z
  .object({
    firstName: z.string(),
    lastName: z.string(),
    state: z.string(),
    city: z.string(),
    birthDate: z.string(),
    phoneCountryCode: z.string(),
    phoneNumber: z.string(),
    zipCode: z.string(),
  })
  .transform((input, ctx): PersonalInfoValues => {
    let valid = true;
    const fail = (field: string, message: string) => {
      valid = false;
      ctx.addIssue({ code: "custom", message, path: [field] });
    };

    const firstName = input.firstName.trim();
    if (firstName.length === 0) fail("firstName", "Enter your name.");
    else if (firstName.length > MAX_NAME_LENGTH)
      fail("firstName", "Must be 50 characters or fewer.");

    const lastName = input.lastName.trim();
    if (lastName.length === 0) fail("lastName", "Enter your last name.");
    else if (lastName.length > MAX_NAME_LENGTH)
      fail("lastName", "Must be 50 characters or fewer.");

    const state = input.state.trim();
    if (state.length > MAX_PLACE_LENGTH)
      fail("state", "Must be 50 characters or fewer.");

    const city = input.city.trim();
    if (city.length > MAX_PLACE_LENGTH)
      fail("city", "Must be 50 characters or fewer.");

    const zipCode = input.zipCode.trim();
    if (zipCode.length > 0 && !ZIP_CODE_PATTERN.test(zipCode))
      fail("zipCode", "Enter a valid zip code.");

    const phoneNumber = input.phoneNumber.trim().replace(/[ -]/g, "");
    const hasPhone = phoneNumber.length > 0;
    if (hasPhone) {
      const knownCode = PHONE_COUNTRY_CODES.some(
        ({ code }) => code === input.phoneCountryCode,
      );
      if (!PHONE_NUMBER_PATTERN.test(phoneNumber) || !knownCode)
        fail("phone", "Enter a valid phone number.");
    }

    const birthDate = input.birthDate.trim();
    if (
      birthDate.length > 0 &&
      (!isCalendarDate(birthDate) ||
        birthDate < MIN_BIRTH_DATE ||
        birthDate > todayInAppTimeZone())
    )
      fail("birthDate", "Enter a valid date of birth.");

    if (!valid) return z.NEVER;

    return {
      firstName,
      lastName,
      state,
      city,
      birthDate,
      // No number means no phone at all, whatever code is selected.
      phoneCountryCode: hasPhone
        ? input.phoneCountryCode
        : DEFAULT_PHONE_COUNTRY_CODE,
      phoneNumber,
      zipCode,
    };
  });

interface StoredProfile {
  firstName: string;
  lastName: string;
  state: string | null;
  city: string | null;
  birthDate: string | null;
  phoneCountryCode: string | null;
  phoneNumber: string | null;
  zipCode: string | null;
}

// Stored profile -> form values: null becomes "", a missing phone shows the
// default code (PROFILE-07).
export function toFormValues(profile: StoredProfile): PersonalInfoValues {
  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    state: profile.state ?? "",
    city: profile.city ?? "",
    birthDate: profile.birthDate ?? "",
    phoneCountryCode: profile.phoneCountryCode ?? DEFAULT_PHONE_COUNTRY_CODE,
    phoneNumber: profile.phoneNumber ?? "",
    zipCode: profile.zipCode ?? "",
  };
}

// 'YYYY-MM-DD' -> 'MM/DD/YYYY'; "" stays "" (PROFILE-08).
export function formatBirthDate(iso: string): string {
  const match = ISO_DATE_PATTERN.exec(iso);
  if (!match) return "";
  return `${match[2]}/${match[3]}/${match[1]}`;
}
