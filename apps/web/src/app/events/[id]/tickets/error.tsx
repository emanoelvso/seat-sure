"use client";

import { RouteError } from "@/components/route-error";

export default function EventTicketsError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <RouteError
      message="We couldn't load tickets for this event."
      onRetry={unstable_retry}
    />
  );
}
