"use server";

import { redirect } from "next/navigation";
import { paths } from "@/config/paths";
import { REQUEST_PASSWORD_RESET } from "@/features/auth/api/request-password-reset";
import { writeResetPendingCookie } from "@/features/auth/api/session-cookies";
import { emailSchema } from "@/features/auth/utils/auth-schemas";
import { graphqlServerFetch } from "@/lib/graphql-server";

export interface RequestPasswordResetFormState {
  values: Record<string, string>;
  fieldErrors: Record<string, string>;
  formError?: string;
}

const GENERIC_ERROR = "Something went wrong. Please try again.";

function readString(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

// AUTH-57, AUTH-58, AUTH-59: validates the email, requests a reset code, and
// writes the reset-pending cookie. The web app redirects to
// /forgot-password/verify whether or not the account exists, so the
// response never reveals account existence.
export async function requestPasswordResetAction(
  _prevState: RequestPasswordResetFormState,
  formData: FormData,
): Promise<RequestPasswordResetFormState> {
  const raw = { email: readString(formData, "email") };
  const values = { email: raw.email };

  const parsed = emailSchema.safeParse(raw);
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
    const { requestPasswordReset } = await graphqlServerFetch(
      REQUEST_PASSWORD_RESET,
      { input: { email: parsed.data.email } },
      { revalidate: 0 },
    );

    await writeResetPendingCookie({
      email: parsed.data.email,
      resendAvailableAt: requestPasswordReset.resendAvailableAt,
      codeSent: requestPasswordReset.codeSent,
    });
  } catch {
    return { values, fieldErrors: {}, formError: GENERIC_ERROR };
  }

  redirect(paths.forgotPasswordVerify.getHref());
}
