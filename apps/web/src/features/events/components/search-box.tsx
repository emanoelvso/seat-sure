"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import {
  CalendarLinearIcon,
  ConfettiMinimalisticLineDuotoneIcon,
  MinimalisticMagnifierOutlineIcon,
} from "@solar-icons/react";
import {
  BookmarkIcon,
  DumbbellSmallIcon,
  FerrisWheelIcon,
  MapPointIcon,
  MasksIcon,
  MusicNoteIcon,
  TicketIcon,
  Widget3Icon,
} from "@solar-icons/react/outline";
import { searchBoxHref } from "@/features/events/utils/search-box-href";
import {
  EVENT_TYPE_LABELS,
  EVENT_TYPES,
  type EventType,
} from "@/utils/event-types";

const TABS = [
  { type: "CONCERT", icon: MusicNoteIcon },
  { type: "SHOW", icon: MasksIcon },
  { type: "SPORT", icon: DumbbellSmallIcon },
  { type: "FESTIVAL", icon: FerrisWheelIcon },
] as const satisfies ReadonlyArray<{ type: EventType; icon: unknown }>;

const FIELD = "flex items-center gap-2";
const INPUT =
  "bg-transparent text-xl text-white placeholder:text-white outline-none focus-visible:ring-2 focus-visible:ring-tint-400 rounded";

export function SearchBox() {
  const router = useRouter();
  const id = useId();
  const [type, setType] = useState<EventType | null>(null);
  const [city, setCity] = useState("");
  const [day, setDay] = useState("");

  function search(event: FormEvent) {
    event.preventDefault();
    router.push(searchBoxHref({ type, city, day }));
  }

  return (
    <>
      <form
        onSubmit={search}
        aria-label="Search events"
        className="bg-neutral-800/80 py-7 px-14 rounded-2xl border border-neutral-500"
      >
        <div
          role="group"
          aria-label="Event categories"
          className="flex gap-40 mb-7"
        >
          {TABS.map(({ type: tab, icon: Icon }) => (
            <button
              key={tab}
              type="button"
              aria-pressed={type === tab}
              onClick={() => setType(type === tab ? null : tab)}
              className={`flex items-center gap-1 hover:text-white transition ${type === tab ? "text-white font-bold" : ""}`}
            >
              <Icon size={20} />
              <span>{EVENT_TYPE_LABELS[tab]}</span>
            </button>
          ))}
        </div>

        <hr className="border-neutral-500/80 w-full" />

        <div className="flex justify-between items-center gap-6 mt-8">
          <label htmlFor={`${id}-type`} className={FIELD}>
            <Widget3Icon className="text-neutral-200" size={30} />
            <span className="flex flex-col text-left">
              <select
                id={`${id}-type`}
                value={type ?? ""}
                onChange={(e) =>
                  setType((e.target.value || null) as EventType | null)
                }
                className={`${INPUT} appearance-none cursor-pointer`}
              >
                <option value="" className="text-black">
                  Any type
                </option>
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t} className="text-black">
                    {EVENT_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
              <span className="text-neutral-200 text-sm">Event Type</span>
            </span>
          </label>
          <label
            htmlFor={`${id}-city`}
            className={`${FIELD} pl-3 border-l border-neutral-500/80`}
          >
            <MapPointIcon className="text-neutral-200" size={30} />
            <span className="flex flex-col text-left">
              <input
                id={`${id}-city`}
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Any city"
                className={`${INPUT} w-40`}
              />
              <span className="text-neutral-200 text-sm">Location</span>
            </span>
          </label>
          <label
            htmlFor={`${id}-day`}
            className={`${FIELD} pl-3 border-l border-neutral-500/80`}
          >
            <CalendarLinearIcon className="text-neutral-200" size={30} />
            <span className="flex flex-col text-left">
              <input
                id={`${id}-day`}
                type="date"
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className={`${INPUT} scheme-dark`}
              />
              <span className="text-neutral-200 text-sm">Date</span>
            </span>
          </label>
          <button
            type="submit"
            aria-label="Search"
            className="p-3 inline-flex items-center cursor-pointer justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tint-400 bg-primary hover:bg-tint-400 text-white active:bg-tint-600"
          >
            <MinimalisticMagnifierOutlineIcon size={24} />
          </button>
        </div>
      </form>

      <ul className="flex mt-4 mb-25 gap-8 list-none">
        <li className="flex items-center gap-1">
          <BookmarkIcon className="text-neutral-200" size={22} />
          <span className="text-neutral-200">Book Anytime</span>
        </li>
        <li className="flex items-center gap-1">
          <TicketIcon className="text-neutral-200" size={22} />
          <span className="text-neutral-200">Refundable Tickets</span>
        </li>
        <li className="flex items-center gap-1">
          <ConfettiMinimalisticLineDuotoneIcon
            className="text-neutral-200"
            size={22}
          />
          <span className="text-neutral-200">Smart Deals</span>
        </li>
      </ul>
    </>
  );
}
