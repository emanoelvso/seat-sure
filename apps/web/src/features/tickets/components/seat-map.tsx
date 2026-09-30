"use client";

import { CupIcon } from "@solar-icons/react/outline";
import { KeyboardEvent, useId, useState } from "react";
import {
  SeatMapLayout,
  SeatMapSection,
  TicketType,
} from "@/features/tickets/api/find-event-tickets";
import { formatPrice } from "@/features/tickets/utils/price";

interface SeatMapProps {
  layout: SeatMapLayout;
  enabledKeys: string[];
  selectedKey?: string;
  onSelect: (key: string) => void;
  /** Ticket type shown in each section's tooltip, by section key. */
  offers?: Record<string, TicketType>;
}

interface ShapeRef {
  key: string;
  shapeIndex: number;
}

function Stage({ layout }: { layout: SeatMapLayout }) {
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
  onShapeEnter,
}: {
  layout: SeatMapLayout;
  section: SeatMapSection;
  fill: string;
  pathClassName?: string;
  onShapeEnter?: (shapeIndex: number) => void;
}) {
  return section.shapes.map((shape, index) => (
    <g
      key={shape.path}
      onPointerEnter={onShapeEnter && (() => onShapeEnter(index))}
    >
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

export function SeatMap({
  layout,
  enabledKeys,
  selectedKey,
  onSelect,
  offers,
}: SeatMapProps) {
  const tooltipId = useId();
  const [hover, setHover] = useState<ShapeRef>();
  const [focusKey, setFocusKey] = useState<string>();

  // The tooltip follows the pointer first, then keyboard focus.
  const anchor =
    hover ??
    (focusKey === undefined ? undefined : { key: focusKey, shapeIndex: 0 });
  const anchorSection = layout.sections.find(
    (section) => section.key === anchor?.key,
  );
  const offer =
    anchor && enabledKeys.includes(anchor.key)
      ? offers?.[anchor.key]
      : undefined;
  const tooltip =
    anchor && anchorSection && offer
      ? {
          key: anchor.key,
          shape: anchorSection.shapes[anchor.shapeIndex],
          offer,
        }
      : undefined;

  return (
    <div className="relative w-full max-w-[704px]">
      <svg
        role="group"
        aria-label="Seat map"
        viewBox={`0 0 ${layout.viewBoxWidth} ${layout.viewBoxHeight}`}
        className="h-auto w-full"
      >
        <Stage layout={layout} />

        {layout.sections.map((section) => {
          const enabled = enabledKeys.includes(section.key);
          const selected = section.key === selectedKey;
          const hovered = enabled && section.key === hover?.key;

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
              aria-describedby={
                tooltip?.key === section.key ? tooltipId : undefined
              }
              onClick={() => enabled && onSelect(section.key)}
              onKeyDown={handleKeyDown}
              onPointerLeave={() => setHover(undefined)}
              onFocus={() => setFocusKey(section.key)}
              onBlur={() => setFocusKey(undefined)}
              className={`group outline-none ${enabled ? "cursor-pointer" : "cursor-not-allowed opacity-40"}`}
            >
              <SectionShapes
                layout={layout}
                section={section}
                fill={
                  selected
                    ? "var(--color-shade-100)"
                    : hovered
                      ? "var(--color-shade-200)"
                      : section.color
                }
                pathClassName="transition-colors group-focus-visible:stroke-tint-400 group-focus-visible:stroke-[3]"
                onShapeEnter={(shapeIndex) =>
                  setHover({ key: section.key, shapeIndex })
                }
              />
            </g>
          );
        })}
      </svg>

      {tooltip && (
        <div
          id={tooltipId}
          role="tooltip"
          style={{
            left: `${(tooltip.shape.labelX / layout.viewBoxWidth) * 100}%`,
            top: `${(tooltip.shape.labelY / layout.viewBoxHeight) * 100}%`,
          }}
          className="pointer-events-none absolute z-10 flex -translate-x-1/2 translate-y-4 items-center gap-3 whitespace-nowrap rounded-lg bg-white px-4 py-2 text-neutral-1000 shadow-lg"
        >
          <CupIcon size={24} aria-hidden="true" className="text-primary" />
          <span className="flex flex-col">
            <span className="text-sm">{`${tooltip.offer.name} seat`}</span>
            <span className="text-lg font-bold">
              {formatPrice(tooltip.offer.priceCents, tooltip.offer.currency)}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}

interface SeatMapPreviewProps {
  layout: SeatMapLayout;
  highlightKey?: string;
}

export function SeatMapPreview({ layout, highlightKey }: SeatMapPreviewProps) {
  const highlighted = layout.sections.find(
    (section) => section.key === highlightKey,
  );

  return (
    <svg
      role="img"
      aria-label={
        highlighted
          ? `Section ${highlighted.label} on the seat map`
          : "Seat map"
      }
      viewBox={`0 0 ${layout.viewBoxWidth} ${layout.viewBoxHeight}`}
      className="h-auto w-full"
    >
      <Stage layout={layout} />
      {layout.sections.map((section) => (
        <g key={section.key}>
          <SectionShapes
            layout={layout}
            section={section}
            fill={
              section === highlighted ? "var(--color-shade-100)" : section.color
            }
          />
        </g>
      ))}
    </svg>
  );
}
