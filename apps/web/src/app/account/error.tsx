"use client";

import { RouteError } from "@/components/route-error";

export default function AccountError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <RouteError
      message="We couldn't load your account."
      onRetry={unstable_retry}
    />
  );
}
