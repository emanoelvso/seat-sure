"use client";

import {
  AltArrowDownIcon,
  AltArrowLeftIcon,
  AltArrowRightIcon,
  CalendarIcon,
} from "@solar-icons/react/outline";
import { format } from "date-fns";
import { Popover, Select } from "radix-ui";
import { useId, useState } from "react";
import { DayPicker } from "react-day-picker";
import {
  formatBirthDate,
  todayInAppTimeZone,
} from "@/features/account/utils/personal-info-schema";

const MIN_YEAR = 1900;
const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// Figma M3 "label/large" (Roboto in the file, Inter here): 14/20, medium,
// 0.1px tracking. Figma uses primary (#c14fe6), which is 4.33:1 on
// neutral-700, under the 4.5:1 a11y gate, so the text uses tint-400.
const LABEL_CLASS =
  "text-sm leading-5 font-medium tracking-[0.1px] text-tint-400";
const ICON_BUTTON_CLASS =
  "flex size-12 cursor-pointer items-center justify-center rounded-full text-primary outline-none focus-visible:bg-primary/10 disabled:pointer-events-none disabled:text-neutral-300";
const ACTION_CLASS = `${LABEL_CLASS} h-10 cursor-pointer rounded-full px-3 outline-none hover:bg-primary/10 focus-visible:bg-primary/10`;

function isoToDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dateToIso(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function DropdownArrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M5.25 7.5L9 11.25L12.75 7.5H5.25Z" fill="currentColor" />
    </svg>
  );
}

interface PartSelectProps {
  label: string;
  value: number;
  options: { value: number; label: string }[];
  onChange: (value: number) => void;
}

// "Aug ▾" / "2023 ▾" menu button of the caption.
function PartSelect({ label, value, options, onChange }: PartSelectProps) {
  return (
    <Select.Root
      value={String(value)}
      onValueChange={(next) => onChange(Number(next))}
    >
      <Select.Trigger
        aria-label={label}
        className={`${LABEL_CLASS} flex h-10 cursor-pointer items-center gap-2 rounded-full py-2.5 pr-1 pl-2 outline-none hover:bg-primary/10 focus-visible:bg-primary/10`}
      >
        <Select.Value />
        <Select.Icon className="flex">
          <DropdownArrow />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={4}
          className="z-[60] max-h-60 rounded-lg bg-neutral-500 py-2"
        >
          <Select.Viewport>
            {options.map((option) => (
              <Select.Item
                key={option.value}
                value={String(option.value)}
                className="flex h-10 cursor-pointer items-center px-4 text-sm text-white outline-none select-none data-[highlighted]:bg-neutral-400 data-[state=checked]:text-primary"
              >
                <Select.ItemText>{option.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

interface BirthDatePickerProps {
  // 'YYYY-MM-DD' or ''.
  value: string;
  onChange: (iso: string) => void;
  // 'YYYY-MM-DD'. Injectable for deterministic stories; defaults to today in
  // the app time zone.
  today?: string;
  error?: string;
}

// Date of birth field + calendar (PROFILE-08), from Figma 5011:120588 (field)
// and "Date Picker" 5011:121097. A day click only fills a draft; OK applies
// it. The caption is ours (month and year each get arrows and a menu), so
// DayPicker's own caption and navigation are off.
export function BirthDatePicker({
  value,
  onChange,
  today,
  error,
}: BirthDatePickerProps) {
  const id = useId();
  const labelId = `${id}-label`;
  const valueId = `${id}-value`;
  const errorId = `${id}-error`;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [month, setMonth] = useState(new Date());

  const todayIso = today ?? todayInAppTimeZone();
  const todayDate = isoToDate(todayIso);
  const maxYear = todayDate.getFullYear();
  const maxMonthOfYear = (year: number) =>
    year === maxYear ? todayDate.getMonth() : 11;

  function handleOpenChange(next: boolean) {
    if (next) {
      setDraft(value);
      setMonth(value ? isoToDate(value) : todayDate);
    }
    setOpen(next);
  }

  // Keeps the month inside Jan 1900 .. today's month.
  function showMonth(year: number, monthIndex: number) {
    const clampedYear = Math.min(Math.max(year, MIN_YEAR), maxYear);
    const clampedMonth = Math.min(monthIndex, maxMonthOfYear(clampedYear));
    setMonth(new Date(clampedYear, Math.max(clampedMonth, 0), 1));
  }

  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const isError = Boolean(error);

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <div className="flex w-full flex-col gap-1">
        <fieldset
          className={`relative w-full rounded-lg border bg-neutral-700 ${isError ? "border-error-400" : "border-neutral-800"}`}
        >
          <legend
            id={labelId}
            className="ml-3 px-1 text-sm leading-none text-neutral-200"
          >
            Date of birth
          </legend>
          <Popover.Trigger asChild>
            <button
              type="button"
              aria-labelledby={`${labelId} ${valueId}`}
              aria-describedby={isError ? errorId : undefined}
              className="relative flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg py-4 pr-4 pl-12 text-lg leading-6 text-white outline-none focus-visible:ring-1 focus-visible:ring-primary"
            >
              <CalendarIcon
                size={24}
                className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-neutral-100"
              />
              <span id={valueId} className="min-h-6">
                {formatBirthDate(value)}
              </span>
              <AltArrowDownIcon size={24} />
            </button>
          </Popover.Trigger>
        </fieldset>
        {isError && (
          <p id={errorId} className="text-xs text-error-300">
            {error}
          </p>
        )}
      </div>
      <Popover.Portal>
        <Popover.Content
          aria-label="Choose date of birth"
          align="end"
          sideOffset={8}
          className="z-50 flex w-113 flex-col rounded-lg bg-neutral-700 py-2 shadow-lg outline-none"
        >
          <div className="flex h-13 items-center justify-between">
            <div className="flex items-center">
              <button
                type="button"
                aria-label="Previous month"
                className={ICON_BUTTON_CLASS}
                disabled={year === MIN_YEAR && monthIndex === 0}
                onClick={() => showMonth(year, monthIndex - 1)}
              >
                <AltArrowLeftIcon size={24} />
              </button>
              <PartSelect
                label="Month"
                value={monthIndex}
                options={MONTH_LABELS.slice(0, maxMonthOfYear(year) + 1).map(
                  (label, index) => ({ value: index, label }),
                )}
                onChange={(next) => showMonth(year, next)}
              />
              <button
                type="button"
                aria-label="Next month"
                className={ICON_BUTTON_CLASS}
                disabled={
                  year === maxYear && monthIndex >= maxMonthOfYear(year)
                }
                onClick={() => showMonth(year, monthIndex + 1)}
              >
                <AltArrowRightIcon size={24} />
              </button>
            </div>
            <div className="flex items-center">
              <button
                type="button"
                aria-label="Previous year"
                className={ICON_BUTTON_CLASS}
                disabled={year === MIN_YEAR}
                onClick={() => showMonth(year - 1, monthIndex)}
              >
                <AltArrowLeftIcon size={24} />
              </button>
              <PartSelect
                label="Year"
                value={year}
                options={Array.from(
                  { length: maxYear - MIN_YEAR + 1 },
                  (_, index) => {
                    const optionYear = MIN_YEAR + index;
                    return { value: optionYear, label: String(optionYear) };
                  },
                )}
                onChange={(next) => showMonth(next, monthIndex)}
              />
              <button
                type="button"
                aria-label="Next year"
                className={ICON_BUTTON_CLASS}
                disabled={year === maxYear}
                onClick={() => showMonth(year + 1, monthIndex)}
              >
                <AltArrowRightIcon size={24} />
              </button>
            </div>
          </div>

          <DayPicker
            mode="single"
            hideNavigation
            weekStartsOn={0}
            showOutsideDays
            month={month}
            onMonthChange={setMonth}
            startMonth={new Date(MIN_YEAR, 0, 1)}
            endMonth={new Date(maxYear, todayDate.getMonth(), 1)}
            selected={draft ? isoToDate(draft) : undefined}
            onSelect={(date) => setDraft(date ? dateToIso(date) : "")}
            disabled={[
              { after: todayDate },
              (date) => date.getMonth() !== monthIndex,
            ]}
            formatters={{
              formatWeekdayName: (date) => format(date, "EEEEE"),
            }}
            components={{ MonthCaption: () => <></> }}
            classNames={{
              root: "px-2 pb-1",
              months: "w-full",
              month: "w-full",
              month_grid: "mx-auto border-separate border-spacing-x-2",
              weekday:
                "size-12 h-10 p-0 text-center text-base leading-6 font-normal tracking-[0.5px] text-white",
              day: "h-10 w-12 p-0 text-center text-white",
              day_button:
                "flex size-10 cursor-pointer items-center justify-center rounded-full text-base leading-6 tracking-[0.5px] outline-none hover:bg-primary/10 focus-visible:bg-primary/10",
              // Figma fills the day with primary; white on it is 3.79:1, so
              // tint-600 (a11y gate 4.5:1).
              selected: "[&>button]:bg-tint-600 [&>button:hover]:bg-tint-600",
              today: "[&>button]:text-primary",
              outside: "opacity-[0.38]",
              disabled: "text-neutral-300 opacity-[0.38]",
            }}
          />

          <div className="flex items-start justify-between px-3">
            <button
              type="button"
              className={ACTION_CLASS}
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              Clear
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={ACTION_CLASS}
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={ACTION_CLASS}
                onClick={() => {
                  onChange(draft);
                  setOpen(false);
                }}
              >
                OK
              </button>
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
