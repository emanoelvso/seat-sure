import {
  SEAT_GLYPH_HEIGHT,
  SEAT_GLYPH_WIDTH,
  SeatGlyph,
  SeatState,
} from "@/features/tickets/components/seat-icon";

const ITEMS: { state: SeatState; label: string }[] = [
  { state: "available", label: "Available" },
  { state: "unavailable", label: "Unavailable" },
  { state: "picked", label: "Selected" },
];

export function SeatLegend() {
  return (
    <ul
      aria-label="Seat legend"
      className="flex items-center justify-between gap-6 rounded-lg bg-neutral-900 px-6 py-3"
    >
      {ITEMS.map(({ state, label }) => (
        <li key={state} className="flex items-center gap-2 font-semibold">
          <svg
            aria-hidden="true"
            viewBox={`0 0 ${SEAT_GLYPH_WIDTH} ${SEAT_GLYPH_HEIGHT}`}
            width={SEAT_GLYPH_WIDTH}
            height={SEAT_GLYPH_HEIGHT}
          >
            <SeatGlyph state={state} />
          </svg>
          {label}
        </li>
      ))}
    </ul>
  );
}
