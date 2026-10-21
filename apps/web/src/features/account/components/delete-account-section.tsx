"use client";

import { unstable_rethrow } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { DeleteAccountResult } from "@/features/account/api/delete-account-action";
import { DeleteAccountDialog } from "./delete-account-dialog";

const GENERIC_ERROR = "Something went wrong. Please try again.";

interface DeleteAccountSectionProps {
  action: (confirmation: string) => Promise<DeleteAccountResult>;
}

// "Delete account" block at the bottom of Account settings (WEB AC 1). It
// owns the dialog's open, pending and error state. On success the action
// redirects, so a returned result is always an error.
export function DeleteAccountSection({ action }: DeleteAccountSectionProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setError(null);
  }

  function confirm(confirmation: string) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await action(confirmation);
        setError(result.error);
      } catch (thrown) {
        // Server Action transport failures are retryable; Next redirects
        // (success, or an expired session) must still reach the router.
        unstable_rethrow(thrown);
        setError(GENERIC_ERROR);
      }
    });
  }

  return (
    <section
      aria-labelledby={`${id}-heading`}
      className="@container flex w-full flex-col items-start gap-4 rounded-3xl bg-neutral-1000 p-6 @min-[640px]:p-10"
    >
      <h2
        id={`${id}-heading`}
        className="text-2xl leading-[29px] font-bold text-white"
      >
        Delete account
      </h2>
      <p className="text-base text-neutral-200">
        Permanently delete your account, profile, saved payment cards and
        notifications. This can&apos;t be undone.
      </p>
      <Button
        type="button"
        size="lg"
        className="bg-error-500! hover:bg-error-500/80! active:bg-error-500/80!"
        onClick={() => setOpen(true)}
      >
        Delete account
      </Button>
      <DeleteAccountDialog
        open={open}
        pending={pending}
        error={error}
        onCancel={close}
        onConfirm={confirm}
      />
    </section>
  );
}
