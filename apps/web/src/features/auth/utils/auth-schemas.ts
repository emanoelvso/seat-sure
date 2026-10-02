import { z } from "zod";

// Mirrors apps/api/src/module/identity/core/model/credential-rules.model.ts
// so the client surfaces the same messages before the API round-trip.
const MAX_NAME_LENGTH = 50;
const MAX_EMAIL_LENGTH = 254;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72;

const PASSWORD_LENGTH_MESSAGE = `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters.`;

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .max(MAX_EMAIL_LENGTH, "Enter a valid email address.")
  .email("Enter a valid email address.");

const passwordField = z
  .string()
  .min(MIN_PASSWORD_LENGTH, PASSWORD_LENGTH_MESSAGE)
  .max(MAX_PASSWORD_LENGTH, PASSWORD_LENGTH_MESSAGE);

export const emailSchema = z.object({
  email: emailField,
});

export const signUpSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "Enter your name.")
    .max(MAX_NAME_LENGTH, "Must be 50 characters or fewer."),
  lastName: z
    .string()
    .trim()
    .min(1, "Enter your last name.")
    .max(MAX_NAME_LENGTH, "Must be 50 characters or fewer."),
  email: emailField,
  password: passwordField,
});

export const logInSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Enter your password."),
});

export const resetPasswordSchema = z
  .object({
    newPassword: passwordField,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });

export type EmailFormValues = z.infer<typeof emailSchema>;
export type SignUpFormValues = z.infer<typeof signUpSchema>;
export type LogInFormValues = z.infer<typeof logInSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
