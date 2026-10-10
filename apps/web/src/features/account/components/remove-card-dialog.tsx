"use client";

import { useEffect, useId, useRef, type SyntheticEvent } from "react";
import { Button } from "@/components/ui/button";
import { brandLabel, type CardBrand } from "@/utils/card";

interface RemoveCardDialogProps {
  open: boolean;
  brand: string;
  last4: string;
  /** True while the remove action runs: both buttons are disabled. */
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

// Remove confirmation (CARD-10 AC 5-7). A native modal <dialog> gives the
// backdrop, the focus trap, and the focus return to whatever opened it. The
// parent owns `open`: Escape and "Cancel" both ask it to close.
export function RemoveCardDialog({
  open,
  brand,
  last4,
  pending = false,
  onCancel,
  onConfirm,
}: RemoveCardDialogProps) {
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
      className="m-auto w-full max-w-[380px] rounded-2xl border-0 bg-neutral-700 p-8 text-center text-white backdrop:bg-black/70"
    >
      <div className="flex flex-col items-center gap-4">
        <h2 id={headingId} className="text-xl font-bold">
          Remove this card?
        </h2>
        <p className="text-sm text-neutral-100">
          {brandLabel(brand as CardBrand)} •••• {last4} will be removed from
          your account.
        </p>
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
          {/* SPEC_DEVIATION: white on primary #C14FE6 is 3.8:1, below WCAG
              AA for 16px text. Reason: tint-600 gives 5.4:1 (as the other
              primary buttons of this feature). */}
          <Button
            type="button"
            size="lg"
            className="flex-1 bg-tint-600! hover:bg-shade-100! active:bg-shade-100!"
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? "Removing…" : "Remove"}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
