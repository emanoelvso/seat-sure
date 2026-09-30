"use client";

import { RouteError } from "@/components/route-error";

export default function ArtistError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <RouteError message="We couldn't load this artist." onRetry={unstable_retry} />
  );
}
