"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { formatCountdown } from "@/features/auth/utils/countdown";
import { CodeInput, type CodeInputHandle } from "./code-input";

export type CodeVerificationPurpose = "verify-email" | "reset-password";

export type CodeVerificationConfirmReason =
  | "CODE_INCORRECT"
  | "CODE_EXPIRED"
  | "CODE_ATTEMPTS_EXCEEDED";

export interface CodeVerificationConfirmState {
  error?: CodeVerificationConfirmReason;
}

export interface CodeVerificationResendState {
  resendAvailableAt?: string;
  codeSent?: boolean;
  error?: string;
}

interface CodeVerificationFormProps {
  purpose: CodeVerificationPurpose;
  title: string;
  description: string;
  resendAvailableAt: string;
  codeSent: boolean;
  confirmAction: (
    purpose: CodeVerificationPurpose,
    prevState: CodeVerificationConfirmState,
    formData: FormData,
  ) => Promise<CodeVerificationConfirmState>;
  resendAction: (
    purpose: CodeVerificationPurpose,
  ) => Promise<CodeVerificationResendState>;
  // Test-only escape hatch: lets stories pin "now" instead of depending on
  // real elapsed time or fake timers.
  now?: () => number;
}

const CODE_LENGTH = 6;

// AUTH-21..23: the exact message for each confirm failure reason.
const CONFIRM_ERROR_MESSAGES: Record<CodeVerificationConfirmReason, string> = {
  CODE_INCORRECT: "Incorrect code. Please try again.",
  CODE_EXPIRED: "This code has expired. Request a new one.",
  CODE_ATTEMPTS_EXCEEDED: "Too many incorrect attempts. Request a new code.",
};

// AUTH-13: shown when the account was created/requested but the code
// couldn't be sent.
const SEND_FAILURE_MESSAGE = "We couldn't send the code. Please try again.";

const initialConfirmState: CodeVerificationConfirmState = {};

function millisecondsUntil(isoDate: string, now: () => number): number {
  return new Date(isoDate).getTime() - now();
}

// AUTH-13..15, AUTH-21..23, AUTH-25, AUTH-26: the shared code-entry form used
// by both /verify-email and /forgot-password/verify (AUTH-60). Renders the
// caller-supplied copy, the 6-digit CodeInput, the resend countdown, and
// Confirm, wiring confirmAction/resendAction for the given purpose.
export function CodeVerificationForm({
  purpose,
  title,
  description,
  resendAvailableAt,
  codeSent,
  confirmAction,
  resendAction,
  now = Date.now,
}: CodeVerificationFormProps) {
  const codeInputRef = useRef<CodeInputHandle>(null);
  const [code, setCode] = useState("");

  async function runConfirmAction(
    prevState: CodeVerificationConfirmState,
    formData: FormData,
  ): Promise<CodeVerificationConfirmState> {
    const result = await confirmAction(purpose, prevState, formData);
    // AUTH-21: a wrong code clears the boxes and focuses the first one.
    if (result.error === "CODE_INCORRECT") {
      codeInputRef.current?.clear();
    }
    return result;
  }

  const [confirmState, formAction, isConfirming] = useActionState(
    runConfirmAction,
    initialConfirmState,
  );

  const [resendAvailableAtState, setResendAvailableAtState] =
    useState(resendAvailableAt);
  const [codeSentState, setCodeSentState] = useState(codeSent);
  const [resendError, setResendError] = useState<string | undefined>(
    undefined,
  );
  const [isResending, setIsResending] = useState(false);
  // Ticks once a second purely to force a re-render; the remaining time
  // itself is derived during render, not stored, so mounting/updating the
  // effect never calls setState synchronously.
  const [, forceTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => forceTick((tick) => tick + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const remainingMs = millisecondsUntil(resendAvailableAtState, now);
  const resendEnabled = !codeSentState || remainingMs <= 0;

  async function handleResend() {
    setIsResending(true);
    const result = await resendAction(purpose);
    setIsResending(false);

    if (result.error) {
      setResendError(result.error);
      return;
    }

    setResendError(undefined);
    setCodeSentState(result.codeSent ?? true);
    if (result.resendAvailableAt) {
      setResendAvailableAtState(result.resendAvailableAt); // AUTH-26
    }
  }

  const confirmErrorMessage = confirmState.error
    ? CONFIRM_ERROR_MESSAGES[confirmState.error]
    : undefined;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <p className="mt-2 text-sm text-neutral-300">{description}</p>
      </div>

      <form
        action={formAction}
        className="flex w-full flex-col items-center gap-4"
      >
        <CodeInput ref={codeInputRef} onChange={setCode} />
        <input type="hidden" name="code" value={code} />

        {!codeSentState && (
          <p className="text-sm text-error-400">{SEND_FAILURE_MESSAGE}</p>
        )}
        {confirmErrorMessage && (
          <p className="text-sm text-error-400">{confirmErrorMessage}</p>
        )}
        {resendError && <p className="text-sm text-error-400">{resendError}</p>}

        <div className="flex w-full items-center justify-between text-sm text-neutral-300">
          <span>Didn&apos;t receive the code?</span>
          <div className="flex items-center gap-2">
            <span>{formatCountdown(remainingMs)}</span>
            <button
              type="button"
              disabled={!resendEnabled || isResending}
              onClick={handleResend}
              className="text-primary disabled:text-neutral-500"
            >
              Resend
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={code.length < CODE_LENGTH || isConfirming}
          className="w-full rounded-lg bg-primary py-3 text-white disabled:opacity-50"
        >
          Confirm
        </button>
      </form>
    </div>
  );
}
