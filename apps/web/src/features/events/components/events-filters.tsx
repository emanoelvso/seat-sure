"use client";

import { ComboBox } from "@/components/ui/combo-box";
import { DatePickerBox } from "@/components/ui/date-picker-box";
import { SelectBox } from "@/components/ui/select-box";
import { SubCategoriePill } from "@/components/ui/sub-categorie-pill";
import {
  EventsSearchParams,
  PRICE_LABELS,
  PriceRange,
  eventsParsers,
} from "@/features/events/utils/events-search-params";
import { EVENT_TYPE_LABELS, EventType } from "@/utils/event-types";
import { formatDateLabel } from "@/utils/format-date-label";
import { WidgetOutlineIcon } from "@solar-icons/react";
import {
  CalendarIcon,
  DollarMinimalisticIcon,
  MapPointIcon,
} from "@solar-icons/react/outline";
import { format, parse } from "date-fns";
import { type Nullable, useQueryStates } from "nuqs";
import { useEffect, useRef, useState } from "react";
import { DateRange } from "react-day-picker";

type Filters = Partial<Nullable<Omit<EventsSearchParams, "page">>>;

// How long the city box waits after the last keystroke before it updates the
// URL, and so the server page.
const CITY_DEBOUNCE_MS = 300;

const CALENDAR_DAY = "yyyy-MM-dd";

// The URL holds calendar days; the date picker works with local dates.
function toLocalDate(day: string) {
  return parse(day, CALENDAR_DAY, new Date());
}

function toCalendarDay(date: Date | undefined) {
  return date ? format(date, CALENDAR_DAY) : null;
}

export function EventsFilters({ cities }: { cities: string[] }) {
  const [{ type, from, to, city, price }, setParams] = useQueryStates(
    eventsParsers,
    { shallow: false, history: "replace" },
  );

  const when: DateRange | undefined = from
    ? { from: toLocalDate(from), to: to ? toLocalDate(to) : undefined }
    : undefined;

  // Any filter change starts over from the first page.
  function setFilters(filters: Filters) {
    setParams({ ...filters, page: null });
  }

  // The box shows what was typed; the URL (and the pills) follow after a pause.
  const [cityText, setCityText] = useState(city ?? "");
  const cityTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // A URL change (back/forward, a deep link) wins over a pending edit.
  const [seenCity, setSeenCity] = useState(city);
  if (city !== seenCity) {
    setSeenCity(city);
    setCityText(city ?? "");
  }
  useEffect(() => {
    clearTimeout(cityTimer.current);
  }, [city]);
  useEffect(() => () => clearTimeout(cityTimer.current), []);

  function typeCity(text: string | undefined) {
    const next = text ?? "";
    setCityText(next);
    clearTimeout(cityTimer.current);
    cityTimer.current = setTimeout(
      () => setFilters({ city: next || null }),
      CITY_DEBOUNCE_MS,
    );
  }

  function pickCity(picked: string) {
    clearTimeout(cityTimer.current);
    setCityText(picked);
    setFilters({ city: picked });
  }

  return (
    <div className="px-27 flex flex-col gap-8">
      <div className="flex gap-4 w-full">
        <SelectBox
          value={type ?? undefined}
          onChange={(v) => setFilters({ type: (v || null) as EventType | null })}
          label="What"
          options={[
            { value: "CONCERT", label: "Concert" },
            { value: "SHOW", label: "Show" },
            { value: "SPORT", label: "Sport" },
            { value: "FESTIVAL", label: "Festival" },
          ]}
          leftIcon={WidgetOutlineIcon}
        />
        <DatePickerBox
          value={when}
          onChange={(range) =>
            setFilters({
              from: toCalendarDay(range?.from),
              to: toCalendarDay(range?.to),
            })
          }
          label="When"
          leftIcon={CalendarIcon}
        />
        <ComboBox
          label="Where"
          placeholder="Search city..."
          options={cities}
          value={cityText}
          onChange={typeCity}
          onSelect={pickCity}
          leftIcon={MapPointIcon}
        />
        <SelectBox
          value={price ?? undefined}
          onChange={(v) =>
            setFilters({ price: (v || null) as PriceRange | null })
          }
          label="Price"
          options={[
            { value: "-100", label: "Under $100" },
            { value: "100-300", label: "$100-300$" },
            { value: "300-500", label: "$300-$500" },
            { value: "+500", label: "Over $500" },
          ]}
          leftIcon={DollarMinimalisticIcon}
        />
      </div>
      <div className="flex items-center gap-4">
        <p className="font-xl text-white">your search:</p>
        {type && (
          <SubCategoriePill
            removable
            onClick={() => setFilters({ type: null })}
          >
            {EVENT_TYPE_LABELS[type]}
          </SubCategoriePill>
        )}
        {when?.from && (
          <SubCategoriePill
            removable
            onClick={() => setFilters({ from: null, to: null })}
          >
            {formatDateLabel(when)}
          </SubCategoriePill>
        )}
        {city && (
          <SubCategoriePill
            removable
            onClick={() => setFilters({ city: null })}
          >
            {city}
          </SubCategoriePill>
        )}
        {price && (
          <SubCategoriePill
            removable
            onClick={() => setFilters({ price: null })}
          >
            {PRICE_LABELS[price]}
          </SubCategoriePill>
        )}
      </div>
    </div>
  );
}
