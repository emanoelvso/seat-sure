"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  demoSignInAction,
  type DemoSignInState,
} from "@/features/auth/api/demo-sign-in-action";
import { safeRedirect } from "@/features/auth/utils/safe-redirect";

interface DemoSignInFormProps {
  redirectTo?: string;
  action?: (state: DemoSignInState, data: FormData) => Promise<DemoSignInState>;
}

const INITIAL_STATE: DemoSignInState = {};

export function DemoSignInForm({
  redirectTo,
  action = demoSignInAction,
}: DemoSignInFormProps) {
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);

  return (
    <form action={formAction} aria-busy={pending} className="flex flex-col gap-4">
      <input type="hidden" name="redirectTo" value={safeRedirect(redirectTo)} />
      <p className="text-sm text-neutral-200">
        Each sign-in creates a separate temporary account.
      </p>
      {state.formError && (
        <p role="alert" className="text-sm text-error-400">{state.formError}</p>
      )}
      {pending && (
        <p role="status" className="text-sm text-neutral-200">Creating your demo account…</p>
      )}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Signing in…" : "Sign in as demo"}
      </Button>
    </form>
  );
}
