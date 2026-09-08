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
import IconButton from "./IconButton";

export default function SearchBox() {
  return (
    <>
      <div className="bg-neutral-800/80 py-7 px-14 rounded-2xl border border-neutral-500">
        <div className="flex gap-40 mb-7">
          <div className="flex items-center gap-1">
            <MusicNoteIcon size={20} />
            <span>Concerts</span>
          </div>
          <div className="flex items-center gap-1">
            <MasksIcon size={20} />
            <span>Shows</span>
          </div>
          <div className="flex items-center gap-1">
            <DumbbellSmallIcon size={20} />
            <span>Sports</span>
          </div>
          <div className="flex items-center gap-1">
            <FerrisWheelIcon size={20} />
            <span>Festivals</span>
          </div>
        </div>

        <hr className="border-neutral-500/80 w-full" />

        <div className="flex justify-between mt-8">
          <div className="flex items-center gap-2 ">
            <Widget3Icon className="text-neutral-200" size={30} />
            <div className="flex flex-col">
              <span className="text-xl">what</span>
              <span className="text-neutral-200 text-sm">Event Type</span>
            </div>
          </div>
          <div className="flex items-center gap-2 pl-3 border-l border-neutral-500/80">
            <MapPointIcon className="text-neutral-200" size={30} />
            <div className="flex flex-col">
              <span className="text-xl">where</span>
              <span className="text-neutral-200 text-sm">Location</span>
            </div>
          </div>
          <div className="flex items-center gap-2 pl-3 border-l border-neutral-500/80">
            <CalendarLinearIcon className="text-neutral-200" size={30} />
            <div className="flex flex-col">
              <span className="text-xl">when</span>
              <span className="text-neutral-200 text-sm">Date</span>
            </div>
          </div>
          <IconButton icon={MinimalisticMagnifierOutlineIcon} />
        </div>
      </div>

      <div className="flex mt-4 mb-25 gap-8">
        <div className="flex items-center gap-1">
          <BookmarkIcon className="text-neutral-200" size={22} />
          <span className="text-neutral-200">Book Anytime</span>
        </div>

        <div className="flex items-center gap-1">
          <TicketIcon className="text-neutral-200" size={22} />
          <span className="text-neutral-200">Refundable Tickets</span>
        </div>
        <div className="flex items-center gap-1">
          <ConfettiMinimalisticLineDuotoneIcon
            className="text-neutral-200"
            size={22}
          />
          <span className="text-neutral-200">Smart Deals</span>
        </div>
      </div>
    </>
  );
}
