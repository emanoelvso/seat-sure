import type { Icon } from "@solar-icons/react/lib/types";
import {
  Chart2Icon,
  GraphNewUpIcon,
  PieChartIcon,
  RoundGraphIcon,
} from "@solar-icons/react/outline";

// Figma draws the timeline as a free-form 1344×280 frame, so each step sits
// at Figma's x center. Odd steps put the label above the line and the pin
// below it; even steps swap them.
const STEPS: { name: string; icon: Icon; centerClassName: string }[] = [
  {
    name: "Research & Discovery",
    icon: PieChartIcon,
    centerClassName: "left-26",
  },
  { name: "Experience Design", icon: Chart2Icon, centerClassName: "left-116" },
  {
    name: "Platform Development",
    icon: GraphNewUpIcon,
    centerClassName: "left-219.75",
  },
  {
    name: "Launch & Growth",
    icon: RoundGraphIcon,
    centerClassName: "left-311.25",
  },
];

function StepPin({ icon: StepIcon, below }: { icon: Icon; below: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`absolute h-28 w-20 -translate-x-1/2 ${below ? "top-42" : "top-0"}`}
    >
      {/* A circle with a tip pointing at the line. */}
      <svg
        viewBox="0 0 80 112"
        className={`size-full fill-shade-200 ${below ? "" : "rotate-180"}`}
      >
        <path d="M40 0L68 77H12Z" />
        <circle cx="40" cy="72" r="40" />
      </svg>
      <StepIcon
        size={42}
        className={`absolute left-1/2 -translate-x-1/2 text-white ${below ? "top-13" : "top-4.5"}`}
      />
    </div>
  );
}

export function StoryTimeline() {
  return (
    <section className="flex flex-col items-center">
      <h2 className="text-section font-semibold text-white">
        What is the story of SeatSure?
      </h2>
      <p className="mt-2 text-neutral-200">
        Every great journey begins with a single step—this is ours
      </p>

      <div className="relative mt-12 h-70 w-336">
        <div
          aria-hidden="true"
          className="absolute top-34.5 left-29.75 h-1 w-277.75 bg-neutral-300"
        />
        <ol>
          {STEPS.map(({ name, icon, centerClassName }, index) => {
            const labelAbove = index % 2 === 0;

            return (
              <li
                key={name}
                className={`absolute inset-y-0 w-0 ${centerClassName}`}
              >
                <p
                  className={`absolute -translate-x-1/2 leading-tight whitespace-nowrap text-white ${labelAbove ? "top-20.75" : "top-43.5"}`}
                >
                  <span aria-hidden="true">{index + 1}.</span>
                  <span>{name}</span>
                </p>
                <span
                  aria-hidden="true"
                  className="absolute top-30.5 flex size-8 -translate-x-1/2 items-center justify-center rounded-full border border-shade-100"
                >
                  <span className="size-6 rounded-full bg-shade-100" />
                </span>
                <StepPin icon={icon} below={labelAbove} />
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
