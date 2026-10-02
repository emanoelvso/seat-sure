"use server";

import { redirect } from "next/navigation";
import { LOG_IN } from "@/features/auth/api/log-in";
import {
  setSessionCookies,
  writePendingCookie,
} from "@/features/auth/api/session-cookies";
import { logInSchema } from "@/features/auth/utils/auth-schemas";
import { safeRedirect } from "@/features/auth/utils/safe-redirect";
import { paths } from "@/config/paths";
import { GraphQLRequestError, graphqlServerFetch } from "@/lib/graphql-server";

export interface LogInFormState {
  values: Record<string, string>;
  fieldErrors: Record<string, string>;
  formError?: string;
}

const GENERIC_ERROR = "Something went wrong. Please try again.";
const INVALID_CREDENTIALS_MESSAGE = "Incorrect email or password.";
const LOGIN_LOCKED_MESSAGE = "Too many attempts. Try again in 15 minutes.";

function readString(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

// AUTH-31, AUTH-33..39: validates with logInSchema, calls logIn, and either
// starts a session and redirects to the safe return path, or defers to
// /verify-email when the account still needs a code.
export async function logInAction(
  _prevState: LogInFormState,
  formData: FormData,
): Promise<LogInFormState> {
  const raw = {
    email: readString(formData, "email"),
    password: readString(formData, "password"),
  };
  const rememberMe = formData.get("rememberMe") === "on";
  const redirectTo = readString(formData, "redirectTo");

  const values = { email: raw.email, redirectTo };

  const parsed = logInSchema.safeParse(raw);
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

  let result;
  try {
    ({ logIn: result } = await graphqlServerFetch(
      LOG_IN,
      {
        input: {
          email: parsed.data.email,
          password: parsed.data.password,
          rememberMe,
        },
      },
      { revalidate: 0 },
    ));
  } catch (error) {
    if (error instanceof GraphQLRequestError) {
      if (error.reason === "INVALID_CREDENTIALS") {
        return { values, fieldErrors: {}, formError: INVALID_CREDENTIALS_MESSAGE };
      }
      if (error.reason === "LOGIN_LOCKED") {
        return { values, fieldErrors: {}, formError: LOGIN_LOCKED_MESSAGE };
      }
    }
    return { values, fieldErrors: {}, formError: GENERIC_ERROR };
  }

  if (result.status === "VERIFICATION_REQUIRED") {
    await writePendingCookie({
      email: parsed.data.email,
      purpose: "verify-email",
      rememberMe,
      redirectTo: redirectTo || undefined,
      resendAvailableAt: result.resendAvailableAt,
      codeSent: result.codeSent,
    });
    redirect(paths.verifyEmail.getHref());
  }

  if (!result.session) {
    return { values, fieldErrors: {}, formError: GENERIC_ERROR };
  }

  await setSessionCookies(result.session);
  redirect(safeRedirect(redirectTo));
}
