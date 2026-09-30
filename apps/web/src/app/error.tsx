"use client";

import { RouteError } from "@/components/route-error";

export default function HomeError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <RouteError message="We couldn't load events." onRetry={unstable_retry} />
  );
}
