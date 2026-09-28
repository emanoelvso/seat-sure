import { KeyboardEvent } from "react";
import {
  GqlSeatMap,
  GqlSeatMapSection,
} from "@/graphql/queries/find-event-tickets";

interface SeatMapProps {
  layout: GqlSeatMap;
  enabledKeys: string[];
  selectedKey?: string;
  onSelect: (key: string) => void;
}

function Stage({ layout }: { layout: GqlSeatMap }) {
  const { stage } = layout;

  return (
    <>
      {stage.shapes.map((shape) => (
        <path key={shape.path} d={shape.path} fill={shape.color} />
      ))}
      {stage.label !== null && (
        <text
          x={stage.labelX ?? undefined}
          y={stage.labelY ?? undefined}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={layout.labelSize}
          fontWeight={layout.labelWeight}
          className="fill-white"
        >
          {stage.label}
        </text>
      )}
    </>
  );
}

function SectionShapes({
  layout,
  section,
  fill,
  pathClassName,
}: {
  layout: GqlSeatMap;
  section: GqlSeatMapSection;
  fill: string;
  pathClassName?: string;
}) {
  return section.shapes.map((shape) => (
    <g key={shape.path}>
      <path d={shape.path} fill={fill} className={pathClassName} />
      <text
        aria-hidden="true"
        x={shape.labelX}
        y={shape.labelY}
        transform={`rotate(${shape.labelRotation} ${shape.labelX} ${shape.labelY})`}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={layout.labelSize}
        fontWeight={layout.labelWeight}
        className="pointer-events-none select-none fill-white"
      >
        {section.label}
      </text>
    </g>
  ));
}

export default function SeatMap({
  layout,
  enabledKeys,
  selectedKey,
  onSelect,
}: SeatMapProps) {
  return (
    <svg
      role="group"
      aria-label="Seat map"
      viewBox={`0 0 ${layout.viewBoxWidth} ${layout.viewBoxHeight}`}
      className="h-auto w-full max-w-[704px]"
    >
      <Stage layout={layout} />

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
            <SectionShapes
              layout={layout}
              section={section}
              fill={selected ? "var(--color-primary)" : section.color}
              pathClassName="transition-colors group-focus-visible:stroke-tint-400 group-focus-visible:stroke-[3]"
            />
          </g>
        );
      })}
    </svg>
  );
}
