"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const FLAG = "accountDeleted";
const DEFAULT_DURATION_MS = 6000;

// Shown on the home page after the account is deleted (WEB AC 4). The delete
// action redirects to `/?accountDeleted=1`. Reading the flag on the client,
// inside a <Suspense> boundary, keeps the ISR home page static. The notice is
// a toast: it takes the flag out of the URL so a reload doesn't bring it back,
// then hides itself after a few seconds.
export function AccountDeletedNotice({
  durationMs = DEFAULT_DURATION_MS,
}: {
  durationMs?: number;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [visible, setVisible] = useState(searchParams.get(FLAG) === "1");

  useEffect(() => {
    if (!visible) return;
    const rest = new URLSearchParams(searchParams.toString());
    rest.delete(FLAG);
    const query = rest.toString();
    window.history.replaceState(
      window.history.state,
      "",
      `${pathname}${query ? `?${query}` : ""}${window.location.hash}`,
    );
    const timer = setTimeout(() => setVisible(false), durationMs);
    return () => clearTimeout(timer);
    // The flag is read once; the cleanup above must not cancel the timer
    // when the URL change re-renders with the flag gone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!visible) return null;

  return (
    <p
      role="status"
      className="fixed top-6 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl border border-neutral-500 bg-neutral-900 px-6 py-4 text-center text-base text-white shadow-lg"
    >
      Your account has been deleted.
    </p>
  );
}
