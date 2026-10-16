"use client";

import { useEffect, useRef, useState } from "react";
import { AltArrowDownIcon } from "@solar-icons/react/outline";

interface NotificationCardProps {
  title: string;
  titleHighlight?: string;
  body: string;
  timestamp: string;
  unread: boolean;
  onActivate: () => void;
}

// One notification (NOTIF-07, NOTIF-09), from Figma "Notification card"
// 4005:40430: Default 4005:40429, Hover 4005:40428, Open 4005:40427. The whole
// card is one button: it marks the notification read through `onActivate` and,
// when the body overflows its 2-line clamp, toggles the full body. The
// chevron points down (Default) and up (Open, rotated).
export function NotificationCard({
  title,
  titleHighlight,
  body,
  timestamp,
  unread,
  onActivate,
}: NotificationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const bodyRef = useRef<HTMLSpanElement>(null);

  // The body overflows when the clamp hides lines. It is measured only while
  // clamped: once open, the full body fits, but the chevron must stay.
  useEffect(() => {
    const element = bodyRef.current;
    if (!element || expanded) return;

    const measure = () =>
      setOverflowing(element.scrollHeight > element.clientHeight + 1);
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [expanded, body]);

  function handleClick() {
    onActivate();
    if (overflowing) setExpanded((open) => !open);
  }

  return (
    <button
      type="button"
      aria-expanded={overflowing ? expanded : undefined}
      onClick={handleClick}
      className="flex w-full cursor-pointer items-stretch justify-between gap-4 rounded-2xl bg-neutral-900 p-4 text-left transition-colors hover:bg-[linear-gradient(90deg,rgb(193_79_230/0.15),rgb(27_27_27/0))] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-[21px]">
        <span className="text-lg leading-[1.2] font-bold text-white">
          {title}
          {titleHighlight && (
            <span className="text-tint-500">{titleHighlight}</span>
          )}
        </span>
        <span
          ref={bodyRef}
          className={`text-base leading-[1.2] whitespace-pre-line text-neutral-200 ${
            expanded ? "block" : "line-clamp-2"
          }`}
        >
          {body}
        </span>
      </span>
      <span className="flex w-36 shrink-0 flex-col items-end justify-between gap-4">
        <span className="flex h-6 w-full items-center justify-end gap-2">
          {unread && (
            <span aria-hidden className="size-3 rounded-full bg-primary" />
          )}
          {unread && <span className="sr-only">Unread</span>}
          {overflowing && (
            <span
              aria-hidden
              data-chevron
              className={`flex size-6 items-center justify-center text-white ${
                expanded ? "rotate-180" : ""
              }`}
            >
              <AltArrowDownIcon size={24} />
            </span>
          )}
        </span>
        <span className="text-sm leading-[1.2] font-medium text-neutral-200">
          {timestamp}
        </span>
      </span>
    </button>
  );
}
