"use client";

import { useActionState } from "react";
import {
  requestPasswordResetAction,
  type RequestPasswordResetFormState,
} from "@/features/auth/api/request-password-reset-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type RequestPasswordResetAction = (
  state: RequestPasswordResetFormState,
  formData: FormData,
) => Promise<RequestPasswordResetFormState>;

interface ForgotPasswordFormProps {
  // Defaults to the real Server Action; Storybook passes a fake one so
  // play() can assert on the submitted FormData without a server.
  action?: RequestPasswordResetAction;
}

const initialState: RequestPasswordResetFormState = {
  values: {},
  fieldErrors: {},
};

// AUTH-56, AUTH-59: the forgot-password form. An Email field and "Get
// verification code" button; an invalid email shows its error inline.
export function ForgotPasswordForm({
  action = requestPasswordResetAction,
}: ForgotPasswordFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Input
        label="Email"
        name="email"
        type="email"
        defaultValue={state.values.email}
        variant={state.fieldErrors.email ? "error" : undefined}
        supportingText={state.fieldErrors.email}
      />
      {state.formError && (
        <p role="alert" className="text-sm text-error-400">
          {state.formError}
        </p>
      )}
      <Button type="submit" variant="primary" size="lg" disabled={pending}>
        Get verification code
      </Button>
    </form>
  );
}
