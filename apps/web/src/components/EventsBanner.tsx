import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function EventsBanner() {
  return (
    <div className="mt-32 relative w-full h-[336px] rounded-2xl overflow-hidden">
      <Image className="object-cover" src={"/artists.png"} alt="Avatar" fill />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to right, #0F0F0F 10%, rgba(19,15,20,0.97) 26%, rgba(29,14,34,0.91) 48%, rgba(172,0,229,0) 170%)",
        }}
      />
      <div className="absolute inset-0 pl-27 flex flex-col justify-center gap-4">
        <span className="font-bold text-4xl">Start exploring event today!</span>
        <span className="font-medium text-neutral-100 text-2xl">
          Find concerts, shows, and more near you.
        </span>
        <Button className="w-fit" size="lg">
          Start
        </Button>
      </div>
    </div>
  );
}
