"use server";

import { redirect } from "next/navigation";
import { paths } from "@/config/paths";
import { SIGN_UP } from "@/features/auth/api/sign-up";
import { writePendingCookie } from "@/features/auth/api/session-cookies";
import { signUpSchema } from "@/features/auth/utils/auth-schemas";
import { GraphQLRequestError, graphqlServerFetch } from "@/lib/graphql-server";

export interface SignUpFormState {
  values: Record<string, string>;
  fieldErrors: Record<string, string>;
  formError?: string;
}

const GENERIC_ERROR = "Something went wrong. Please try again.";
const EMAIL_TAKEN_MESSAGE = "An account with this email already exists.";

function readString(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

// AUTH-02, AUTH-04, AUTH-06..13: validates with signUpSchema, calls signUp,
// stores the pending verify-email state in a cookie, and redirects to
// /verify-email on success.
export async function signUpAction(
  _prevState: SignUpFormState,
  formData: FormData,
): Promise<SignUpFormState> {
  const raw = {
    firstName: readString(formData, "firstName"),
    lastName: readString(formData, "lastName"),
    email: readString(formData, "email"),
    password: readString(formData, "password"),
  };
  const rememberMe = formData.get("rememberMe") === "on";
  const redirectTo = readString(formData, "redirectTo");

  // Submitted values are echoed back on error so the form can refill itself;
  // the password never is.
  const values = {
    firstName: raw.firstName,
    lastName: raw.lastName,
    email: raw.email,
    redirectTo,
  };

  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string" && !fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    return { values, fieldErrors };
  }

  try {
    const { signUp } = await graphqlServerFetch(
      SIGN_UP,
      {
        input: {
          firstName: parsed.data.firstName,
          lastName: parsed.data.lastName,
          email: parsed.data.email,
          password: parsed.data.password,
        },
      },
      { revalidate: 0 },
    );

    await writePendingCookie({
      email: signUp.email,
      purpose: "verify-email",
      rememberMe,
      redirectTo: redirectTo || undefined,
      resendAvailableAt: signUp.resendAvailableAt,
      codeSent: signUp.codeSent,
    });
  } catch (error) {
    if (error instanceof GraphQLRequestError) {
      if (error.reason === "EMAIL_TAKEN") {
        return { values, fieldErrors: { email: EMAIL_TAKEN_MESSAGE } };
      }
      if (error.reason === "INVALID_INPUT" && error.fields) {
        return { values, fieldErrors: error.fields };
      }
    }
    return { values, fieldErrors: {}, formError: GENERIC_ERROR };
  }

  redirect(paths.verifyEmail.getHref());
}
