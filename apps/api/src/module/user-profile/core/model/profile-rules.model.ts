const MAX_NAME_LENGTH = 50;
const MAX_PLACE_LENGTH = 50;
const MIN_BIRTH_DATE = '1900-01-01';

const ZIP_CODE_PATTERN = /^[A-Za-z0-9 -]{3,10}$/;
const PHONE_NUMBER_PATTERN = /^\d{4,14}$/;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export const PHONE_COUNTRY_CODES = ['+1', '+49', '+34', '+33'] as const;

export interface UpdateProfileInput {
  firstName: string;
  lastName: string;
  state: string;
  city: string;
  birthDate: string;
  phoneCountryCode: string;
  phoneNumber: string;
  zipCode: string;
}

export interface NormalizedProfile {
  firstName: string;
  lastName: string;
  state: string | null;
  city: string | null;
  birthDate: string | null;
  phoneCountryCode: string | null;
  phoneNumber: string | null;
  zipCode: string | null;
}

export interface ProfileValidationResult {
  value?: NormalizedProfile;
  fields?: Record<string, string>;
}

const isCalendarDate = (value: string): boolean => {
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) {
    return false;
  }
  const [year, month, day] = [match[1], match[2], match[3]].map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

// Same shape as `validateSignUpCredentials`: each field is checked on its own
// so every message is returned at once. `today` is the 'YYYY-MM-DD' date in
// the app time zone; ISO dates compare correctly as strings.
export function validateProfileUpdate(
  input: UpdateProfileInput,
  today: string,
): ProfileValidationResult {
  const fields: Record<string, string> = {};

  const firstName = input.firstName.trim();
  if (firstName.length === 0) {
    fields.firstName = 'Enter your name.';
  } else if (firstName.length > MAX_NAME_LENGTH) {
    fields.firstName = 'Must be 50 characters or fewer.';
  }

  const lastName = input.lastName.trim();
  if (lastName.length === 0) {
    fields.lastName = 'Enter your last name.';
  } else if (lastName.length > MAX_NAME_LENGTH) {
    fields.lastName = 'Must be 50 characters or fewer.';
  }

  const state = input.state.trim();
  if (state.length > MAX_PLACE_LENGTH) {
    fields.state = 'Must be 50 characters or fewer.';
  }

  const city = input.city.trim();
  if (city.length > MAX_PLACE_LENGTH) {
    fields.city = 'Must be 50 characters or fewer.';
  }

  const zipCode = input.zipCode.trim();
  if (zipCode.length > 0 && !ZIP_CODE_PATTERN.test(zipCode)) {
    fields.zipCode = 'Enter a valid zip code.';
  }

  const phoneNumber = input.phoneNumber.trim().replace(/[ -]/g, '');
  if (phoneNumber.length > 0) {
    const knownCode = (PHONE_COUNTRY_CODES as readonly string[]).includes(
      input.phoneCountryCode,
    );
    if (!PHONE_NUMBER_PATTERN.test(phoneNumber) || !knownCode) {
      fields.phone = 'Enter a valid phone number.';
    }
  }

  const birthDate = input.birthDate.trim();
  if (
    birthDate.length > 0 &&
    (!isCalendarDate(birthDate) ||
      birthDate < MIN_BIRTH_DATE ||
      birthDate > today)
  ) {
    fields.birthDate = 'Enter a valid date of birth.';
  }

  if (Object.keys(fields).length > 0) {
    return { fields };
  }

  const hasPhone = phoneNumber.length > 0;

  return {
    value: {
      firstName,
      lastName,
      state: state || null,
      city: city || null,
      birthDate: birthDate || null,
      phoneCountryCode: hasPhone ? input.phoneCountryCode : null,
      phoneNumber: hasPhone ? phoneNumber : null,
      zipCode: zipCode || null,
    },
  };
}
