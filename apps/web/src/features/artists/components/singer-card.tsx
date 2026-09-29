import Image from "next/image";

interface SingerCardProps {
  name?: string;
  date?: string;
  location?: string;
  imageUrl?: string;
}

export function SingerCard({
  name = "Adele",
  date = "5 May",
  location = "New York",
  imageUrl = "https://sb.kaleidousercontent.com/67418/1920x1545/c5f15ac173/samuel-raita-ridxdghg7pw-unsplash.jpg",
}: SingerCardProps) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-neutral-800 min-w-[200px] border border-neutral-500 p-1">
      <div className="w-[75px] h-[75px] rounded-lg overflow-hidden flex-shrink-0">
        <Image
          className="object-cover w-full h-full"
          src={imageUrl}
          alt={`${name} avatar`}
          width={75}
          height={75}
        />
      </div>
      <div className="flex flex-col">
        <span className="font-medium text-lg">{name}</span>
        <span className="text-neutral-200 text-sm">{date}, {location}</span>
      </div>
    </div>
  );
}
