import Image from "next/image";

export default function SingerCard() {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-neutral-800 max-w-2xs border border-neutral-500 p-1">
      <div className="w-[75px] h-[75px] rounded-lg overflow-hidden">
        <Image
          className="object-cover w-full h-full"
          src="https://sb.kaleidousercontent.com/67418/1920x1545/c5f15ac173/samuel-raita-ridxdghg7pw-unsplash.jpg"
          alt="Singer Avatar"
          width={40}
          height={40}
        />
      </div>
      <div className="flex flex-col">
        <span className="font-medium text-lg">Adele</span>
        <span className="text-neutral-200 text-sm">5 May, New York</span>
      </div>
    </div>
  );
}
