"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type SyntheticEvent,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const DELETE_PHRASE = "DELETE";

interface DeleteAccountDialogProps {
  open: boolean;
  /** True while the delete action runs: both buttons are disabled. */
  pending?: boolean;
  /** Shown in an alert; the dialog stays open (WEB AC 5, 6). */
  error?: string | null;
  onCancel: () => void;
  /** Called with the confirmation the user typed, trimmed. */
  onConfirm: (confirmation: string) => void;
}

// Delete-account confirmation (WEB AC 2, 3, 7, 8). A native modal <dialog>
// gives the backdrop, the focus trap, and the focus return to the trigger.
// The parent owns `open`: Escape and "Cancel" both ask it to close.
export function DeleteAccountDialog({
  open,
  pending = false,
  error = null,
  onCancel,
  onConfirm,
}: DeleteAccountDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    // Keep the dialog open until the parent says otherwise.
    event.preventDefault();
    if (!pending) onCancel();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={headingId}
      onCancel={handleCancel}
      className="m-auto w-full max-w-[420px] rounded-2xl border-0 bg-neutral-700 p-8 text-white backdrop:bg-black/70"
    >
      {/* The form remounts on every open, so the typed text never survives a
          cancel. */}
      {open && (
        <ConfirmForm
          headingId={headingId}
          pending={pending}
          error={error}
          onCancel={onCancel}
          onConfirm={onConfirm}
        />
      )}
    </dialog>
  );
}

interface ConfirmFormProps
  extends Pick<
    DeleteAccountDialogProps,
    "error" | "onCancel" | "onConfirm"
  > {
  headingId: string;
  pending: boolean;
}

function ConfirmForm({
  headingId,
  pending,
  error,
  onCancel,
  onConfirm,
}: ConfirmFormProps) {
  const [value, setValue] = useState("");
  const confirmed = value.trim() === DELETE_PHRASE;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (confirmed && !pending) onConfirm(value.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h2 id={headingId} className="text-xl font-bold">
        Delete your account?
      </h2>
      <div className="flex flex-col gap-2 text-sm text-neutral-100">
        <p>This can&apos;t be undone. We will delete:</p>
        <ul className="list-disc pl-5">
          <li>Your account and profile</li>
          <li>Your saved payment cards</li>
          <li>Your notifications</li>
        </ul>
        <p>You will be signed out on every device.</p>
      </div>
      <Input
        label="Type DELETE to confirm"
        value={value}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        disabled={pending}
        onChange={(event) => setValue(event.target.value)}
      />
      {error && (
        <p role="alert" className="text-sm text-error-200">
          {error}
        </p>
      )}
      <div className="flex w-full gap-4">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="flex-1"
          disabled={pending}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="lg"
          className="flex-1 bg-error-500! hover:bg-error-500/80! active:bg-error-500/80! disabled:bg-neutral-900!"
          disabled={!confirmed || pending}
        >
          {pending ? "Deleting…" : "Delete account"}
        </Button>
      </div>
    </form>
  );
}
