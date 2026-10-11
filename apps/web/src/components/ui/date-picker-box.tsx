"use client";
import { formatDateLabel } from "@/utils/format-date-label";
import { Icon } from "@solar-icons/react/lib/types";
import { AltArrowDownIcon } from "@solar-icons/react/outline";
import { Popover } from "radix-ui";
import { createElement, useId, useState } from "react";
import { DateRange, DayPicker } from "react-day-picker";

interface DatePickerBoxProps {
  label: string;
  leftIcon: Icon;
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
}

export function DatePickerBox({
  label,
  value,
  leftIcon,
  onChange,
}: DatePickerBoxProps) {
  const [open, setOpen] = useState(false);
  const legendId = useId();
  const buttonId = useId();

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <div className="w-full max-w-xl flex flex-col gap-1">
        <fieldset className="relative w-full bg-neutral-700 border rounded-lg border-neutral-800">
          <legend id={legendId} className="ml-3 px-1 text-xs text-neutral-200 leading-none">
            {label}
          </legend>
          <Popover.Trigger asChild>
            <button
              id={buttonId}
              aria-labelledby={`${legendId} ${buttonId}`}
              className={`flex items-center justify-between gap-3 w-full bg-transparent outline-none text-sm pl-12 pr-4 py-2 cursor-pointer relative ${value?.from ? "text-white" : "text-neutral-200"}`}
            >
              {createElement(leftIcon, {
                className:
                  "absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-300",
                size: 18,
              })}
              <span>{formatDateLabel(value)}</span>
              <AltArrowDownIcon size={18} className="text-neutral-300" />
            </button>
          </Popover.Trigger>
        </fieldset>
      </div>
      <Popover.Portal>
        <Popover.Content
          aria-label={label}
          sideOffset={4}
          onInteractOutside={() => setOpen(false)}
          style={{ width: "var(--radix-popover-trigger-width)" }}
          className="rounded-lg border border-neutral-800 bg-neutral-950 shadow-lg z-50 p-3"
        >
          <DayPicker
            mode="range"
            selected={value}
            onSelect={onChange}
            classNames={{
              months: "w-full",
              month: "w-full",
              month_grid: "w-full table-fixed border-collapse",
              month_caption: "text-center mb-2 mt-0",
              weekday: "text-center text-neutral-200 text-sm pb-1",
              day: "text-center",
              day_button: "w-full text-center",
              today: "text-tint-500",
              selected: "bg-primary text-white rounded",
              range_start: "bg-primary text-white rounded-l",
              range_end: "bg-primary text-white rounded-r",
              range_middle: "bg-neutral-800 text-white",
            }}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
