import Image from "next/image";
import { googleMapsSearchUrl } from "@/utils/event-format";

interface VenueMapCardProps {
  address: string;
}

export function VenueMapCard({ address }: VenueMapCardProps) {
  return (
    <a
      href={googleMapsSearchUrl(address)}
      target="_blank"
      rel="noopener noreferrer"
      className="relative block h-[218px] w-full overflow-hidden rounded-2xl"
    >
      <Image
        src="/artist/map.png"
        alt=""
        fill
        sizes="288px"
        className="object-cover"
      />
      <span className="absolute left-1/2 top-[27px] size-[98px] -translate-x-1/2">
        <Image src="/artist/map-pin.svg" alt="" fill unoptimized />
      </span>
      <span className="absolute inset-x-4 top-[125px] line-clamp-2 text-center text-sm">
        {address}
      </span>
    </a>
  );
}
