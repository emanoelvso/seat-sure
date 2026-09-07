import {
  CalendarIcon,
  ClockCircleIcon,
  MapPointIcon,
} from "@solar-icons/react/outline";
import Image from "next/image";

interface MainCardProps {
  avatarUrl: string;
  timeToEnd?: string;
}

export default function MainCard({ avatarUrl, timeToEnd }: MainCardProps) {
  return (
    <>
      <div className="relative w-xs h-[336px] rounded-2xl overflow-hidden">
        <Image
          className="object-cover w-full h-full"
          src={avatarUrl}
          alt="Avatar"
          width={40}
          height={40}
        />
      </div>
      <div className="absolute left-12 top-70 w-2xs border border-neutral-500 rounded-2xl">
        {timeToEnd && (
          <div className="flex justify-between items-ceenter bg-error-500 text-xs px-4 py-2 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <ClockCircleIcon size={16} />
              <span>Time to end</span>
            </div>
            <span>06:34:15</span>
          </div>
        )}

        <div
          className={`bg-neutral-800 p-4 ${timeToEnd ? "rounded-b-2xl" : "rounded-2xl"}`}
        >
          <span className="font-xl font-bold">Jennifer Lopez</span>
          <div className="flex justify-between mt-4 mb-4 text-neutral-200 text-sm">
            <div className="flex items-center gap-1">
              <CalendarIcon size={16} />
              <span>22 November</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPointIcon size={16} />
              <span>Myanmar</span>
            </div>
          </div>
          <span className="font-bold font-lg text-tint-400">from $140</span>
        </div>
      </div>
    </>
  );
}
