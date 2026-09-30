import { CalendarIcon, MapPointIcon } from "@solar-icons/react/outline";
import Image from "next/image";
import { CountdownBadge } from "@/components/ui/countdown-badge";

export interface MainCardProps {
  className?: string;
  avatarUrl: string;
  timeToEnd?: string;
  name: string;
  date: string;
  location: string;
  price?: number;
  category?: string | null;
}

export function MainCard({
  className,
  avatarUrl,
  name,
  date,
  location,
  price,
}: MainCardProps) {
  return (
    <div className={`relative w-2xs shrink-0 ${className}`}>
      <div className="w-full h-[336px] rounded-2xl overflow-hidden">
        <Image
          className="object-cover w-full h-full"
          src={avatarUrl}
          alt="Avatar"
          width={400}
          height={336}
        />
      </div>
      <div className="absolute left-1/2 -translate-x-1/2 -bottom-16 w-[90%] border border-neutral-500 rounded-2xl overflow-hidden">
        <CountdownBadge eventDate={date} />

        <div className="bg-neutral-800 p-4">
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
            <span className="font-bold font-lg text-tint-400">
              from ${price}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
