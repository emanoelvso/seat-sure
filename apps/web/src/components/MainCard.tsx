import {
  CalendarIcon,
  ClockCircleIcon,
  MapPointIcon,
} from "@solar-icons/react/outline";
import Image from "next/image";

export interface MainCardProps {
  avatarUrl: string;
  timeToEnd?: string;
  name: string;
  date: string;
  location: string;
  price?: number;
  category?: string | null;
}

export default function MainCard({
  avatarUrl,
  timeToEnd,
  name,
  date,
  location,
  price,
}: MainCardProps) {
  return (
    <div className="relative mt-6 w-2xs shrink-0">
      <div className="w-full h-[336px] rounded-2xl overflow-hidden">
        <Image
          className="object-cover w-full h-full"
          src={avatarUrl}
          alt="Avatar"
          width={400}
          height={336}
        />
      </div>
      <div className="absolute left-1/2 -translate-x-1/2 -bottom-16 w-[90%] border border-neutral-500 rounded-2xl">
        {timeToEnd && (
          <div className="flex justify-between items-center bg-error-500 text-xs px-4 py-2 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <ClockCircleIcon size={16} />
              <span>Time to end</span>
            </div>
            <span>{timeToEnd}</span>
          </div>
        )}

        <div
          className={`bg-neutral-800 p-4 ${timeToEnd ? "rounded-b-2xl" : "rounded-2xl"}`}
        >
          <span className="font-xl font-bold">{name}</span>
          <div className="flex justify-between mt-4 mb-4 text-neutral-200 text-sm">
            <div className="flex items-center gap-1">
              <CalendarIcon size={16} />
              <span>{date}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPointIcon size={16} />
              <span>{location}</span>
            </div>
          </div>
          {price !== undefined && (
            <span className="font-bold font-lg text-tint-400">from ${price}</span>
          )}
        </div>
      </div>
    </div>
  );
}
