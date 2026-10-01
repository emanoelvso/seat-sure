"use client";

import { KeyboardEvent, useId } from "react";
import type { Seat } from "@/features/tickets/api/find-ticket-type-seats";
import {
  SEAT_GLYPH_HEIGHT,
  SEAT_GLYPH_WIDTH,
  SeatGlyph,
  SeatState,
} from "@/features/tickets/components/seat-icon";
import {
  ChartFrame,
  chartFrame,
  columnLabels,
  rowLabels,
  SEAT_SIZE,
  STAGE_HEIGHT,
} from "@/features/tickets/utils/seat-chart";

interface SeatChartProps {
  seats: Seat[];
  unavailableIds: Set<string>;
  /** Picked seat ids, earliest first. */
  pickedIds: string[];
  onPick: (seat: Seat) => void;
}

// A decorative purple arc over the seats, in the stage band of the frame,
// with a soft glow under it (frame 12).
function StageArc({ frame, seats }: { frame: ChartFrame; seats: Seat[] }) {
  const id = useId();
  const left = frame.minX;
  const right = Math.max(...seats.map((seat) => seat.x)) + SEAT_SIZE / 2;
  const middle = (left + right) / 2;
  const top = frame.minY + 4;
  const bottom = frame.minY + STAGE_HEIGHT;

  return (
    <g aria-hidden="true" className="pointer-events-none">
      <defs>
        <linearGradient id={`${id}-arc`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="var(--color-primary)" stopOpacity={0.1} />
          <stop offset="0.5" stopColor="var(--color-primary)" />
          <stop offset="1" stopColor="var(--color-primary)" stopOpacity={0.1} />
        </linearGradient>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0" stopColor="var(--color-primary)" stopOpacity={0.18} />
          <stop offset="1" stopColor="var(--color-primary)" stopOpacity={0} />
        </radialGradient>
      </defs>
      <ellipse
        cx={middle}
        cy={bottom + 100}
        rx={(right - left) * 0.4}
        ry={180}
        fill={`url(#${id}-glow)`}
      />
      <path
        d={`M${left} ${bottom}Q${middle} ${2 * top - bottom} ${right} ${bottom}`}
        fill="none"
        stroke={`url(#${id}-arc)`}
        strokeWidth={3}
      />
    </g>
  );
}

function SeatButton({
  seat,
  state,
  onPick,
}: {
  seat: Seat;
  state: SeatState;
  onPick: (seat: Seat) => void;
}) {
  const unavailable = state === "unavailable";

  function pick() {
    if (!unavailable) onPick(seat);
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    pick();
  }

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`Row ${seat.row}, Seat ${seat.number}`}
      aria-pressed={state === "picked"}
      aria-disabled={unavailable}
      data-state={state}
      transform={`translate(${seat.x - SEAT_GLYPH_WIDTH / 2} ${seat.y - SEAT_GLYPH_HEIGHT / 2})`}
      onClick={pick}
      onKeyDown={handleKeyDown}
      className={`group outline-none ${unavailable ? "cursor-not-allowed" : "cursor-pointer"}`}
    >
      {/* The whole seat box takes the pointer and shows keyboard focus. */}
      <rect
        x={-2}
        y={-2}
        width={SEAT_GLYPH_WIDTH + 4}
        height={SEAT_GLYPH_HEIGHT + 4}
        rx={6}
        fill="transparent"
        className="group-focus-visible:stroke-tint-400 group-focus-visible:stroke-2"
      />
      <SeatGlyph state={state} />
    </g>
  );
}

export function SeatChart({
  seats,
  unavailableIds,
  pickedIds,
  onPick,
}: SeatChartProps) {
  const frame = chartFrame(seats);

  function stateOf(seat: Seat): SeatState {
    if (unavailableIds.has(seat.id)) return "unavailable";
    return pickedIds.includes(seat.id) ? "picked" : "available";
  }

  return (
    <div className="relative w-full max-w-[808px]">
      <svg
        role="group"
        aria-label="Seats"
        viewBox={`${frame.minX} ${frame.minY} ${frame.width} ${frame.height}`}
        className="h-auto w-full"
      >
        <StageArc frame={frame} seats={seats} />

        {seats.map((seat) => (
          <SeatButton
            key={seat.id}
            seat={seat}
            state={stateOf(seat)}
            onPick={onPick}
          />
        ))}

        {/* The seats' accessible names already carry their row and number. */}
        <g
          aria-hidden="true"
          data-testid="row-labels"
          className="pointer-events-none select-none fill-neutral-200"
        >
          {rowLabels(seats).map((label) => (
            <text
              key={label.row}
              x={label.x}
              y={label.y}
              textAnchor="start"
              dominantBaseline="central"
              fontSize={18}
            >
              {label.row}
            </text>
          ))}
        </g>
        <g
          aria-hidden="true"
          data-testid="column-labels"
          className="pointer-events-none select-none fill-neutral-300"
        >
          {columnLabels(seats).map((label) => (
            <text
              key={label.number}
              x={label.x}
              y={label.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={16}
            >
              {label.number}
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
}
