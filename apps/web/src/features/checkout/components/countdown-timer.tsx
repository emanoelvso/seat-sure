"use client";

import { useEffect, useRef, useState } from "react";
import { countdownDigits } from "@/features/checkout/utils/checkout-format";

interface CountdownTimerProps {
  secondsLeft: number;
  running: boolean;
  onExpire?: () => void;
}

function DigitBox({ children }: { children: string }) {
  return (
    <span
      aria-hidden="true"
      data-countdown-digit="true"
      className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-700 text-lg font-bold text-white"
    >
      {children}
    </span>
  );
}

// PAY-19, PAY-58: counts down once per second from the seconds left at
// render, based on elapsed wall-clock time since mount (no drift,
// CountdownBadge's pattern). Calls onExpire once at 0.
export function CountdownTimer({
  secondsLeft,
  running,
  onExpire,
}: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(secondsLeft);
  const [resetFor, setResetFor] = useState(secondsLeft);
  const expiredRef = useRef(false);

  // Resets the countdown when secondsLeft changes, without an effect (React
  // supports setState during render for "adjusting state on prop change").
  if (secondsLeft !== resetFor) {
    setResetFor(secondsLeft);
    setRemaining(secondsLeft);
  }

  useEffect(() => {
    expiredRef.current = false;
    if (!running) return;

    const startedAt = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const next = Math.max(0, secondsLeft - elapsed);
      setRemaining(next);

      if (next === 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [running, secondsLeft, onExpire]);

  const [d1, d2, d3, d4] = countdownDigits(remaining);
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return (
    <div
      role="timer"
      aria-label={`${minutes} minutes ${seconds} seconds left`}
      className="flex items-center gap-4"
    >
      <div className="flex items-center gap-1.5">
        <DigitBox>{d1}</DigitBox>
        <DigitBox>{d2}</DigitBox>
        <span aria-hidden="true" className="text-xl font-bold text-neutral-300">
          :
        </span>
        <DigitBox>{d3}</DigitBox>
        <DigitBox>{d4}</DigitBox>
      </div>
      <div className="text-sm text-neutral-200">
        <p>left to complete your purchase</p>
        <p className="text-neutral-200">
          Your price is only guaranteed for this time!
        </p>
      </div>
    </div>
  );
}
