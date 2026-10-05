// Formats a remaining-time countdown (ms) as `mm:ss`, rounding up to the next
// whole second so the display never hits 00:00 before the resend is actually
// available, and floored at 00:00 for non-positive values (AUTH-25).
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => value.toString().padStart(2, "0");
  return `${pad(minutes)}:${pad(seconds)}`;
}
