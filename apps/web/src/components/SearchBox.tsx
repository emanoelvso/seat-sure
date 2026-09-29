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
import { IconButton } from "@/components/ui/icon-button";

export default function SearchBox() {
  return (
    <>
      <div className="bg-neutral-800/80 py-7 px-14 rounded-2xl border border-neutral-500">
        <div role="tablist" aria-label="Event categories" className="flex gap-40 mb-7">
          <button role="tab" className="flex items-center gap-1 hover:text-white transition">
            <MusicNoteIcon size={20} />
            <span>Concerts</span>
          </button>
          <button role="tab" className="flex items-center gap-1 hover:text-white transition">
            <MasksIcon size={20} />
            <span>Shows</span>
          </button>
          <button role="tab" className="flex items-center gap-1 hover:text-white transition">
            <DumbbellSmallIcon size={20} />
            <span>Sports</span>
          </button>
          <button role="tab" className="flex items-center gap-1 hover:text-white transition">
            <FerrisWheelIcon size={20} />
            <span>Festivals</span>
          </button>
        </div>

        <hr className="border-neutral-500/80 w-full" />

        <div className="flex justify-between mt-8">
          <button aria-label="Filter by event type" className="flex items-center gap-2 hover:text-white transition">
            <Widget3Icon className="text-neutral-200" size={30} />
            <div className="flex flex-col text-left">
              <span className="text-xl">what</span>
              <span className="text-neutral-200 text-sm">Event Type</span>
            </div>
          </button>
          <button aria-label="Filter by location" className="flex items-center gap-2 pl-3 border-l border-neutral-500/80 hover:text-white transition">
            <MapPointIcon className="text-neutral-200" size={30} />
            <div className="flex flex-col text-left">
              <span className="text-xl">where</span>
              <span className="text-neutral-200 text-sm">Location</span>
            </div>
          </button>
          <button aria-label="Filter by date" className="flex items-center gap-2 pl-3 border-l border-neutral-500/80 hover:text-white transition">
            <CalendarLinearIcon className="text-neutral-200" size={30} />
            <div className="flex flex-col text-left">
              <span className="text-xl">when</span>
              <span className="text-neutral-200 text-sm">Date</span>
            </div>
          </button>
          <IconButton icon={MinimalisticMagnifierOutlineIcon} />
        </div>
      </div>

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
