import { EyeIcon } from "@solar-icons/react/outline";
import { viewRatingWord } from "@/features/tickets/utils/seat-filters";

interface SeatViewRatingProps {
  sectionName: string;
  view: { score: number; label: string };
}

// The view rating card under the mini map (frame 12, node 10354:22405).
export function SeatViewRating({ sectionName, view }: SeatViewRatingProps) {
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-start justify-between gap-32">
        <p className="font-bold text-white">{`Section ${sectionName} selected`}</p>
        <div className="flex items-center gap-1.5">
          <span className="rounded-xl bg-warning-200/8 px-3 py-1 text-xs text-warning-200">
            {view.score.toFixed(1)}
          </span>
          <span className="text-white">{viewRatingWord(view.score)}</span>
        </div>
      </div>
      <div className="flex items-start gap-2 text-sm text-tint-100">
        <EyeIcon
          size={18}
          aria-hidden="true"
          data-testid="eye-icon"
          className="text-white"
        />
        <span>{view.label}</span>
      </div>
    </div>
  );
}
