"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { paths } from "@/config/paths";
import {
  resetPasswordAction,
  type ResetPasswordFormState,
} from "@/features/auth/api/reset-password-action";
import { PasswordField } from "@/features/auth/components/password-field";
import { ResetResultDialog } from "@/features/auth/components/reset-result-dialog";
import { Button } from "@/components/ui/button";

type ResetPasswordAction = (
  state: ResetPasswordFormState,
  formData: FormData,
) => Promise<ResetPasswordFormState>;

interface ResetPasswordFormProps {
  // Defaults to the real Server Action; Storybook passes a fake one so
  // play() can assert on the submitted FormData without a server.
  action?: ResetPasswordAction;
}

const initialState: ResetPasswordFormState = { fieldErrors: {} };

// AUTH-61..64, AUTH-67..69: the reset-password form. The two password
// fields are controlled (not just defaultValue) so a typed value survives
// the form reset React performs after the action runs (needed for AUTH-69,
// where a "stay" failure must keep what was typed). The result dialog opens
// on success or failure; "Try again" either navigates back to
// /forgot-password (restart) or just dismisses the dialog, keeping the form
// (stay).
export function ResetPasswordForm({
  action = resetPasswordAction,
}: ResetPasswordFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, initialState);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [dismissed, setDismissed] = useState(false);
  // A fresh action result (even an identical status) should always be able
  // to show the dialog again. Resetting during render (not an effect)
  // avoids the extra commit a useEffect-based reset would cause.
  const [lastState, setLastState] = useState(state);
  if (state !== lastState) {
    setLastState(state);
    setDismissed(false);
  }

  const dialogOpen = Boolean(state.status) && !dismissed;
  const dialogStatus = state.status === "success" ? "success" : "failure";

  function handleRetry() {
    if (state.retry === "restart") {
      router.push(paths.forgotPassword.getHref());
      return;
    }
    setDismissed(true);
  }

  return (
    <>
      <form action={formAction} className="flex flex-col gap-4">
        <PasswordField
          label="New Password"
          name="newPassword"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          variant={state.fieldErrors.newPassword ? "error" : undefined}
          supportingText={state.fieldErrors.newPassword}
        />
        <PasswordField
          label="Re-enter New Password"
          name="confirmPassword"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          variant={state.fieldErrors.confirmPassword ? "error" : undefined}
          supportingText={state.fieldErrors.confirmPassword}
        />
        <Button type="submit" variant="primary" size="lg" disabled={pending}>
          Reset password
        </Button>
      </form>
      <ResetResultDialog
        open={dialogOpen}
        status={dialogStatus}
        onRetry={handleRetry}
      />
    </>
  );
}
