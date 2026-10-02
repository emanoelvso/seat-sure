import { z } from 'zod';

const MAX_NAME_LENGTH = 50;
const MAX_EMAIL_LENGTH = 254;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72;

const emailFormatSchema = z.string().email();

export interface SignUpCredentialsInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface NormalizedCredentials {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface CredentialValidationResult {
  value?: NormalizedCredentials;
  fields?: Record<string, string>;
}

// Field-specific messages exactly as specified; a plain zod object schema
// can't vary the message per boundary (empty vs too-long) and per field
// (first vs last name) the way this feature needs, so each field is checked
// individually and the messages are collected into `fields`.
export function validateSignUpCredentials(
  input: SignUpCredentialsInput,
): CredentialValidationResult {
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

  const email = input.email.trim().toLowerCase();
  if (
    email.length > MAX_EMAIL_LENGTH ||
    !emailFormatSchema.safeParse(email).success
  ) {
    fields.email = 'Enter a valid email address.';
  }

  const passwordMessage = validatePassword(input.password);
  if (passwordMessage) {
    fields.password = passwordMessage;
  }

  if (Object.keys(fields).length > 0) {
    return { fields };
  }

  return {
    value: { firstName, lastName, email, password: input.password },
  };
}

export function validatePassword(password: string): string | null {
  if (
    password.length < MIN_PASSWORD_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    return 'Password must be between 8 and 72 characters.';
  }
  return null;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
