"use server";

import { redirect } from "next/navigation";
import { paths } from "@/config/paths";
import { CONFIRM_PASSWORD_RESET_CODE } from "@/features/auth/api/confirm-password-reset-code";
import {
  deletePendingCookie,
  deleteResetPendingCookie,
  readPendingCookie,
  readResetPendingCookie,
  setSessionCookies,
  writeResetGrantCookie,
} from "@/features/auth/api/session-cookies";
import { VERIFY_EMAIL } from "@/features/auth/api/verify-email";
import type {
  CodeVerificationConfirmState,
  CodeVerificationPurpose,
} from "@/features/auth/components/code-verification-form";

export type {
  CodeVerificationConfirmState,
  CodeVerificationPurpose,
} from "@/features/auth/components/code-verification-form";
import { safeRedirect } from "@/features/auth/utils/safe-redirect";
import { GraphQLRequestError, graphqlServerFetch } from "@/lib/graphql-server";

interface VerifyEmailPendingCookie {
  email: string;
  purpose: "verify-email";
  rememberMe: boolean;
  redirectTo?: string;
  resendAvailableAt: string;
  codeSent: boolean;
}

interface ResetPendingCookie {
  email: string;
  resendAvailableAt: string;
  codeSent: boolean;
}

const CODE_REASONS = new Set([
  "CODE_INCORRECT",
  "CODE_EXPIRED",
  "CODE_ATTEMPTS_EXCEEDED",
]);

function readCode(formData: FormData): string {
  const value = formData.get("code");
  return typeof value === "string" ? value : "";
}

function isCodeReason(
  reason: string | undefined,
): reason is CodeVerificationConfirmState["error"] {
  return reason !== undefined && CODE_REASONS.has(reason);
}

// AUTH-20, AUTH-21..23, AUTH-60: confirms the pending code for the given
// purpose. verify-email starts the session and redirects to the pending
// return path; reset-password writes the reset grant and redirects to
// /reset-password. A missing pending cookie sends the visitor back to the
// purpose's start page.
export async function verifyCodeAction(
  purpose: CodeVerificationPurpose,
  _prevState: CodeVerificationConfirmState,
  formData: FormData,
): Promise<CodeVerificationConfirmState> {
  const code = readCode(formData);

  if (purpose === "verify-email") {
    const pending = await readPendingCookie<VerifyEmailPendingCookie>();
    if (!pending) {
      redirect(paths.login.getHref());
    }

    try {
      const { verifyEmail } = await graphqlServerFetch(
        VERIFY_EMAIL,
        {
          input: {
            email: pending.email,
            code,
            rememberMe: pending.rememberMe,
          },
        },
        { revalidate: 0 },
      );

      await setSessionCookies(verifyEmail);
      await deletePendingCookie();
    } catch (error) {
      if (error instanceof GraphQLRequestError && isCodeReason(error.reason)) {
        return { error: error.reason };
      }
      throw error;
    }

    redirect(safeRedirect(pending.redirectTo));
  }

  const pending = await readResetPendingCookie<ResetPendingCookie>();
  if (!pending) {
    redirect(paths.forgotPassword.getHref());
  }

  try {
    const { confirmPasswordResetCode } = await graphqlServerFetch(
      CONFIRM_PASSWORD_RESET_CODE,
      { input: { email: pending.email, code } },
      { revalidate: 0 },
    );

    await writeResetGrantCookie(confirmPasswordResetCode);
    await deleteResetPendingCookie();
  } catch (error) {
    if (error instanceof GraphQLRequestError && isCodeReason(error.reason)) {
      return { error: error.reason };
    }
    throw error;
  }

  redirect(paths.resetPassword.getHref());
}
