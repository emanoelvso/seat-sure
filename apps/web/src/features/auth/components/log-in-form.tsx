"use client";

import Link from "next/link";
import { useActionState } from "react";
import { paths } from "@/config/paths";
import {
  logInAction,
  type LogInFormState,
} from "@/features/auth/api/log-in-action";
import { PasswordField } from "@/features/auth/components/password-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

type LogInAction = (
  state: LogInFormState,
  formData: FormData,
) => Promise<LogInFormState>;

interface LogInFormProps {
  redirectTo?: string;
  // Defaults to the real Server Action; Storybook passes a fake one so
  // play() can assert on the submitted FormData without a server.
  action?: LogInAction;
}

const initialState: LogInFormState = { values: {}, fieldErrors: {} };

// AUTH-29, AUTH-30, AUTH-33, AUTH-37: the log-in form. Field values (never
// the password) are refilled from the action's state after a failed submit.
export function LogInForm({ redirectTo, action = logInAction }: LogInFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input
        type="hidden"
        name="redirectTo"
        value={state.values.redirectTo ?? redirectTo ?? ""}
      />
      <Input
        label="Email"
        name="email"
        type="email"
        defaultValue={state.values.email}
        variant={state.fieldErrors.email ? "error" : undefined}
        supportingText={state.fieldErrors.email}
      />
      <PasswordField
        label="Password"
        name="password"
        variant={state.fieldErrors.password ? "error" : undefined}
        supportingText={state.fieldErrors.password}
      />
      <div className="flex items-center justify-between">
        <Checkbox label="Remember me" name="rememberMe" />
        <Link
          href={paths.forgotPassword.getHref()}
          className="text-sm text-neutral-300"
        >
          Forgot Password?
        </Link>
      </div>
      {state.formError && (
        <p role="alert" className="text-sm text-error-400">
          {state.formError}
        </p>
      )}
      <Button type="submit" variant="primary" size="lg" disabled={pending}>
        Log in
      </Button>
      <p className="text-center text-sm text-neutral-300">
        New to SeatSure?{" "}
        <Link
          href={paths.signup.getHref(redirectTo)}
          className="text-tint-500"
        >
          Create account
        </Link>
      </p>
    </form>
  );
}
