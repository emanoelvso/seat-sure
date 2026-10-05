"use server";

import { RESET_PASSWORD } from "@/features/auth/api/reset-password";
import {
  deleteResetGrantCookie,
  readResetGrantCookie,
  writeResetDoneCookie,
} from "@/features/auth/api/session-cookies";
import { resetPasswordSchema } from "@/features/auth/utils/auth-schemas";
import { GraphQLRequestError, graphqlServerFetch } from "@/lib/graphql-server";

export interface ResetPasswordFormState {
  fieldErrors: Record<string, string>;
  status?: "success" | "failed";
  retry?: "restart" | "stay";
}

interface ResetGrantCookie {
  resetToken: string;
  expiresAt: string;
}

function readString(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

// AUTH-62..64, AUTH-67..69: validates the two new-password fields, then
// spends the reset grant cookie's token against the API. A missing grant or
// RESET_GRANT_INVALID sends the visitor back to restart the flow from
// /forgot-password; any other failure keeps them on the form. Success
// deletes the grant and starts no session.
export async function resetPasswordAction(
  _prevState: ResetPasswordFormState,
  formData: FormData,
): Promise<ResetPasswordFormState> {
  const raw = {
    newPassword: readString(formData, "newPassword"),
    confirmPassword: readString(formData, "confirmPassword"),
  };

  const parsed = resetPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string" && !fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    return { fieldErrors };
  }

  const grant = await readResetGrantCookie<ResetGrantCookie>();
  if (!grant) {
    return { fieldErrors: {}, status: "failed", retry: "restart" };
  }

  try {
    await graphqlServerFetch(
      RESET_PASSWORD,
      {
        input: {
          resetToken: grant.resetToken,
          newPassword: parsed.data.newPassword,
        },
      },
      { revalidate: 0 },
    );

    await deleteResetGrantCookie();
    // Deleting the grant cookie makes Next.js refresh this page's Server
    // Component (it read that cookie on the last render), and without this
    // breadcrumb, the just-deleted grant would read as "missing" and
    // AUTH-70's guard would bounce the visitor to /forgot-password before
    // the success dialog (AUTH-67) can render. The breadcrumb is short-lived
    // and only ever read as a "we just succeeded" signal, never re-used to
    // spend the reset.
    await writeResetDoneCookie();
    return { fieldErrors: {}, status: "success" };
  } catch (error) {
    if (
      error instanceof GraphQLRequestError &&
      error.reason === "RESET_GRANT_INVALID"
    ) {
      return { fieldErrors: {}, status: "failed", retry: "restart" };
    }
    return { fieldErrors: {}, status: "failed", retry: "stay" };
  }
}
