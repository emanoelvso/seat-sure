import { KeyboardEvent } from "react";
import { GqlSeatMap } from "@/graphql/queries/find-event-tickets";

interface SeatMapProps {
  layout: GqlSeatMap;
  enabledKeys: string[];
  selectedKey?: string;
  onSelect: (key: string) => void;
}

export default function SeatMap({
  layout,
  enabledKeys,
  selectedKey,
  onSelect,
}: SeatMapProps) {
  const { stage } = layout;

  return (
    <svg
      role="group"
      aria-label="Seat map"
      viewBox={`0 0 ${layout.viewBoxWidth} ${layout.viewBoxHeight}`}
      className="h-auto w-full max-w-[704px]"
    >
      <path d={stage.path} className="fill-neutral-200" />
      <text
        x={stage.labelX}
        y={stage.labelY}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-white text-2xl font-bold"
      >
        {stage.label}
      </text>

      {layout.sections.map((section) => {
        const enabled = enabledKeys.includes(section.key);
        const selected = section.key === selectedKey;

        function handleKeyDown(event: KeyboardEvent) {
          if (event.key !== "Enter" && event.key !== " ") return;

          event.preventDefault();
          if (enabled) onSelect(section.key);
        }

        return (
          <g
            key={section.key}
            role="button"
            tabIndex={0}
            aria-label={`Section ${section.label}`}
            aria-pressed={selected}
            aria-disabled={!enabled}
            onClick={() => enabled && onSelect(section.key)}
            onKeyDown={handleKeyDown}
            className={`group outline-none ${enabled ? "cursor-pointer" : "cursor-not-allowed opacity-40"}`}
          >
            <path
              d={section.path}
              fill={selected ? "var(--color-primary)" : section.color}
              className="transition-colors group-focus-visible:stroke-tint-400 group-focus-visible:stroke-[3]"
            />
            <text
              aria-hidden="true"
              x={section.labelX}
              y={section.labelY}
              textAnchor="middle"
              dominantBaseline="central"
              className="pointer-events-none select-none fill-white text-2xl font-bold"
            >
              {section.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
