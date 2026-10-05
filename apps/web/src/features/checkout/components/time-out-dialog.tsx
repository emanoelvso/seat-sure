"use client";

import Link from "next/link";
import { useEffect, useId, useRef, type SyntheticEvent } from "react";

interface TimeOutDialogProps {
  open: boolean;
  seatsHref: string;
}

// PAY-58, PAY-59: the countdown's time-out modal. Not dismissable - the
// only way out is "Choose seats".
export function TimeOutDialog({ open, seatsHref }: TimeOutDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault();
  }

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={headingId}
      onCancel={handleCancel}
      className="m-auto w-full max-w-[380px] rounded-2xl border-0 bg-neutral-700 p-8 text-center text-white backdrop:bg-black/70"
    >
      <div className="flex flex-col items-center gap-4">
        <h2 id={headingId} className="text-xl font-bold">
          Your time ran out
        </h2>
        <p className="text-sm text-neutral-200">
          Your seats were released. Pick your seats again.
        </p>
        <Link
          href={seatsHref}
          className="text-primary underline"
        >
          Choose seats
        </Link>
      </div>
    </dialog>
  );
}
