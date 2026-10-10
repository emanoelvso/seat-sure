"use client";

import Link from "next/link";
import { useActionState } from "react";
import { UserIcon } from "@solar-icons/react/outline";
import { paths } from "@/config/paths";
import {
  signUpAction,
  type SignUpFormState,
} from "@/features/auth/api/sign-up-action";
import { PasswordField } from "@/features/auth/components/password-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

type SignUpAction = (
  state: SignUpFormState,
  formData: FormData,
) => Promise<SignUpFormState>;

interface SignUpFormProps {
  redirectTo?: string;
  // Defaults to the real Server Action; Storybook passes a fake one so
  // play() can assert on the submitted FormData without a server.
  action?: SignUpAction;
}

const initialState: SignUpFormState = { values: {}, fieldErrors: {} };

// AUTH-01, AUTH-06..10, AUTH-12: the sign-up form. Field values (never the
// password) are refilled from the action's state after a failed submit.
export function SignUpForm({ redirectTo, action = signUpAction }: SignUpFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input
        type="hidden"
        name="redirectTo"
        value={state.values.redirectTo ?? redirectTo ?? ""}
      />
      <div className="flex gap-4">
        <Input
          label="Name"
          name="firstName"
          leftIcon={UserIcon}
          defaultValue={state.values.firstName}
          variant={state.fieldErrors.firstName ? "error" : undefined}
          supportingText={state.fieldErrors.firstName}
        />
        <Input
          label="Last name"
          name="lastName"
          leftIcon={UserIcon}
          defaultValue={state.values.lastName}
          variant={state.fieldErrors.lastName ? "error" : undefined}
          supportingText={state.fieldErrors.lastName}
        />
      </div>
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
      <Checkbox label="Remember me" name="rememberMe" />
      {state.formError && (
        <p role="alert" className="text-sm text-error-400">
          {state.formError}
        </p>
      )}
      <Button type="submit" variant="primary" size="lg" disabled={pending}>
        Sign up
      </Button>
      <p className="text-center text-sm text-neutral-300">
        Have a SeatSure account?{" "}
        <Link href={paths.login.getHref(redirectTo)} className="text-tint-500">
          Sign in
        </Link>
      </p>
    </form>
  );
}
