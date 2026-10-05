// Pure checkout formatting helpers (PAY-19, PAY-21).

interface CheckoutOrderItem {
  number: string;
}

// PAY-21: "Section {name} • Row {row} • Seats {numbers}" line's seat part.
// Numbers sort numerically ("2" before "10"), matching seat-picks.ts's
// byNumber.
export function seatsLabel(items: CheckoutOrderItem[]): string {
  const numbers = [...items]
    .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }))
    .map((item) => item.number);

  return numbers.length === 1
    ? `Seat ${numbers[0]}`
    : `Seats ${numbers.join(", ")}`;
}

export function ticketCountLine(quantity: number): string {
  return quantity === 1
    ? "1 ticket"
    : `${quantity} tickets • Seated together`;
}

const MAX_COUNTDOWN_SECONDS = 99 * 60 + 59;

// PAY-19: MM:SS digit boxes, capped at 99:59 and never negative.
export function countdownDigits(
  seconds: number,
): [string, string, string, string] {
  const capped = Math.min(Math.max(seconds, 0), MAX_COUNTDOWN_SECONDS);
  const minutes = Math.floor(capped / 60);
  const remainingSeconds = capped % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(remainingSeconds).padStart(2, "0");

  return [mm[0], mm[1], ss[0], ss[1]];
}
