"use client";

import { Button } from "@/components/ui/button";

interface RouteErrorProps {
  message: string;
  onRetry: () => void;
}

export function RouteError({ message, onRetry }: RouteErrorProps) {
  return (
    <div role="alert" className="flex flex-col items-start gap-6">
      <p className="text-2xl font-semibold">{message}</p>
      <Button onClick={onRetry}>Try again</Button>
    </div>
  );
}
