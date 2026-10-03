"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef } from "react";
import { paths } from "@/config/paths";
import { Button, buttonVariants } from "@/components/ui/button";
import passwordChangeFailed from "../../../../public/auth/password-change-failed.png";
import passwordChanged from "../../../../public/auth/password-changed.png";

export type ResetResultStatus = "success" | "failure";

interface ResetResultDialogProps {
  open: boolean;
  status: ResetResultStatus;
  /** Called when "Try again" is pressed on the failure dialog. */
  onRetry: () => void;
}

// AUTH-67..69: a native <dialog> showing the reset-password outcome. Success
// shows the green check and a "Log in" link; failure shows the red cross
// and a "Try again" button that calls onRetry (the host decides whether to
// restart the flow or keep the form, per the failure's retry kind).
export function ResetResultDialog({
  open,
  status,
  onRetry,
}: ResetResultDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const isSuccess = status === "success";

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={headingId}
      className="m-auto w-full max-w-[424px] rounded-2xl border-0 bg-neutral-700 p-8 text-center text-white backdrop:bg-black/70"
    >
      <div className="flex flex-col items-center gap-6">
        <Image
          src={isSuccess ? passwordChanged : passwordChangeFailed}
          alt=""
          className="h-20 w-20"
        />

        <div>
          <h2 id={headingId} className="text-xl font-semibold">
            {isSuccess
              ? "Password Changed Successfully"
              : "Password Change Failed"}
          </h2>
          <p className="mt-2 text-sm text-neutral-300">
            {isSuccess
              ? "You can now go back to the login page and log in with your new password."
              : "There was a problem changing your password."}
          </p>
        </div>

        {isSuccess ? (
          <Link
            href={paths.login.getHref()}
            className={`w-full ${buttonVariants({ variant: "primary", size: "lg" })}`}
          >
            Log in
          </Link>
        ) : (
          <Button
            type="button"
            variant="primary"
            size="lg"
            className="w-full"
            onClick={onRetry}
          >
            Try again
          </Button>
        )}
      </div>
    </dialog>
  );
}
