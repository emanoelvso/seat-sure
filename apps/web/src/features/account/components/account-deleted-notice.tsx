"use client";

import { useSearchParams } from "next/navigation";

// Shown on the home page after the account is deleted (WEB AC 4). The delete
// action redirects to `/?accountDeleted=1`. Reading the flag on the client,
// inside a <Suspense> boundary, keeps the ISR home page static.
export function AccountDeletedNotice() {
  const searchParams = useSearchParams();
  if (searchParams.get("accountDeleted") !== "1") return null;

  return (
    <p
      role="status"
      className="mb-8 rounded-xl border border-neutral-500 bg-neutral-900 px-6 py-4 text-base text-white"
    >
      Your account has been deleted.
    </p>
  );
}
