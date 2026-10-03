"use server";

import {
  readPendingCookie,
  readResetPendingCookie,
  writePendingCookie,
  writeResetPendingCookie,
} from "@/features/auth/api/session-cookies";
import { RESEND_CODE } from "@/features/auth/api/resend-code";
import type {
  CodeVerificationPurpose,
  CodeVerificationResendState,
} from "@/features/auth/components/code-verification-form";
import { graphqlServerFetch } from "@/lib/graphql-server";

interface VerifyEmailPendingCookie {
  email: string;
  [key: string]: unknown;
}

interface ResetPendingCookie {
  email: string;
  [key: string]: unknown;
}

const SEND_FAILURE_MESSAGE = "We couldn't send the code. Please try again.";

// AUTH-26, AUTH-27: asks the API for a new code for the pending email and
// purpose, updates the pending cookie's resendAvailableAt/codeSent on
// success, and returns an error state (cookie left untouched) when the API
// refuses (e.g. RESEND_TOO_SOON) or the request fails.
export async function resendCodeAction(
  purpose: CodeVerificationPurpose,
): Promise<CodeVerificationResendState> {
  if (purpose === "verify-email") {
    const pending = await readPendingCookie<VerifyEmailPendingCookie>();
    if (!pending) {
      return { error: SEND_FAILURE_MESSAGE };
    }

    try {
      const { resendCode } = await graphqlServerFetch(
        RESEND_CODE,
        { input: { email: pending.email, purpose } },
        { revalidate: 0 },
      );

      await writePendingCookie({
        ...pending,
        resendAvailableAt: resendCode.resendAvailableAt,
        codeSent: resendCode.codeSent,
      });

      return {
        resendAvailableAt: resendCode.resendAvailableAt,
        codeSent: resendCode.codeSent,
      };
    } catch {
      return { error: SEND_FAILURE_MESSAGE };
    }
  }

  const pending = await readResetPendingCookie<ResetPendingCookie>();
  if (!pending) {
    return { error: SEND_FAILURE_MESSAGE };
  }

  try {
    const { resendCode } = await graphqlServerFetch(
      RESEND_CODE,
      { input: { email: pending.email, purpose } },
      { revalidate: 0 },
    );

    await writeResetPendingCookie({
      ...pending,
      resendAvailableAt: resendCode.resendAvailableAt,
      codeSent: resendCode.codeSent,
    });

    return {
      resendAvailableAt: resendCode.resendAvailableAt,
      codeSent: resendCode.codeSent,
    };
  } catch {
    return { error: SEND_FAILURE_MESSAGE };
  }
}
