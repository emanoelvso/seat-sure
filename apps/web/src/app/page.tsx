import Header from "@/components/Header";
import {
  DumbbellSmallIcon,
  FerrisWheelIcon,
  MasksIcon,
  MusicNoteIcon,
} from "@solar-icons/react/outline";

export default function Home() {
  return (
    <>
      <Header className="py-4 px-8" />
      <div className="flex flex-col items-center">
        <h2 className="font-bold text-7xl max-w-3xl text-center mb-8">
          What <span className="text-tint-400">Concert</span> would you like to
          go to?
        </h2>
        <p className="text-xl mb-10">
          More than 100 concerts in different countries are now available to
          you.
        </p>
        <div className="bg-neutral-800/80 py-9 px-14 rounded-2xl border border-neutral-500">
          <div className="flex gap-40">
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
        </div>
      </div>
    </>
  );
}
