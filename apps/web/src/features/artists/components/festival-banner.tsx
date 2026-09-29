import Image from "next/image";
import Link from "next/link";
import { EventSummary } from "@/types/api";

const ART = "/artist/festival-banner";

const equalizers = [
  { src: `${ART}/equalizer-left.svg`, className: "left-0 right-[70%] top-1/2 bottom-[0.5%]" },
  { src: `${ART}/equalizer-center.svg`, className: "left-[30.15%] right-[40.36%] top-1/2 bottom-[0.5%]" },
  { src: `${ART}/equalizer-center.svg`, className: "left-[59.87%] right-[10.65%] top-[50.5%] bottom-0" },
  { src: `${ART}/equalizer-right.svg`, className: "left-[89.47%] right-0 top-[53.5%] bottom-[0.3%]" },
];

const cornerGlow = "drop-shadow-[0_0_3px_var(--color-primary)]";

interface FestivalBannerProps {
  event: EventSummary;
}

export function FestivalBanner({ event }: FestivalBannerProps) {
  return (
    <Link
      href={`/events/${event.id}/tickets`}
      className="relative block h-[200px] overflow-hidden rounded-3xl bg-shade-600"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[url(/artist/festival-banner/notes.svg)] bg-[length:200px_200px] bg-repeat-x"
      />
      <div className="absolute inset-x-0 top-[147px] h-[53px] bg-[rgba(60,10,65,0.91)] blur-[69px]" />
      {equalizers.map((equalizer, index) => (
        <div key={index} className={`absolute ${equalizer.className}`}>
          <Image src={equalizer.src} alt="" fill unoptimized />
        </div>
      ))}
      <span
        className={`absolute left-6 top-6 h-[65px] w-[233px] border-l border-t border-primary ${cornerGlow}`}
      />
      <span
        className={`absolute right-6 top-6 h-[65px] w-[233px] border-r border-t border-primary ${cornerGlow}`}
      />

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center">
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm font-medium lowercase text-neutral-100">
            in {event.city}
          </span>
          <h2 className="text-[44px] font-bold uppercase leading-none">
            {event.name}
          </h2>
        </div>
        {event.description && (
          <p className="text-lg font-medium uppercase text-neutral-100">
            {event.description}
          </p>
        )}
      </div>
    </Link>
  );
}
