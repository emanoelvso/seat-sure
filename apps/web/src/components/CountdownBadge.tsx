"use client";

import { ClockCircleIcon } from "@solar-icons/react/outline";
import { differenceInSeconds } from "date-fns";
import { useEffect, useState } from "react";

interface CountdownBadgeProps {
  eventDate: string;
}

function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return "Starting now";

  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  return [h > 0 ? `${h}h` : null, m > 0 ? `${m}m` : null, `${s}s`]
    .filter(Boolean)
    .join(" ");
}

export default function CountdownBadge({ eventDate }: CountdownBadgeProps) {
  const [remaining, setRemaining] = useState(() =>
    differenceInSeconds(new Date(eventDate), new Date())
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(differenceInSeconds(new Date(eventDate), new Date()));
    }, 1000);

    return () => clearInterval(interval);
  }, [eventDate]);

  if (remaining >= 24 * 3600) return null;

  return (
    <div className="flex justify-between items-center bg-error-500 text-xs px-4 py-2">
      <div className="flex items-center gap-2">
        <ClockCircleIcon size={16} />
        <span>Time to start</span>
      </div>
      <span>{formatCountdown(remaining)}</span>
    </div>
  );
}
