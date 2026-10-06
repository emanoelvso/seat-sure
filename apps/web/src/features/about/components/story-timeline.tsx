import type { Icon } from "@solar-icons/react/lib/types";
import {
  Chart2Icon,
  GraphNewUpIcon,
  PieChart2Icon,
  RefreshCircleIcon,
} from "@solar-icons/react/linear";

const STEPS: { name: string; icon: Icon }[] = [
  { name: "Research & Discovery", icon: PieChart2Icon },
  { name: "Experience Design", icon: Chart2Icon },
  { name: "Platform Development", icon: GraphNewUpIcon },
  { name: "Launch & Growth", icon: RefreshCircleIcon },
];

function StepPin({
  icon: StepIcon,
  pointsUp,
}: {
  icon: Icon;
  pointsUp: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={`flex items-center ${pointsUp ? "mt-5 flex-col-reverse" : "mb-4 flex-col"}`}
    >
      <span className="flex size-20 items-center justify-center rounded-full bg-shade-200 text-white">
        <StepIcon size={40} />
      </span>
      <svg
        viewBox="0 0 24 32"
        className={`-my-1 h-8 w-6 fill-shade-200 ${pointsUp ? "rotate-180" : ""}`}
      >
        <path d="M0 0H24L12 32Z" />
      </svg>
    </div>
  );
}

function StepLabel({ number, name }: { number: number; name: string }) {
  return (
    <p className="text-center text-white">
      <span aria-hidden="true">{number}.</span>
      <span>{name}</span>
    </p>
  );
}

export function StoryTimeline() {
  return (
    <section className="flex flex-col items-center">
      <h2 className="text-3xl font-semibold text-white">
        What is the story of SeatSure?
      </h2>
      <p className="mt-2 text-neutral-200">
        Every great journey begins with a single step—this is ours
      </p>

      <div className="relative mt-12 w-full px-15">
        {/* The line runs between the first and last step dots. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-37 top-34 h-1 bg-neutral-300"
        />
        <ol className="relative flex justify-between">
          {STEPS.map(({ name, icon }, index) => {
            // Odd steps show the label above the line and the pin below it;
            // even steps swap them.
            const labelAbove = index % 2 === 0;
            const label = <StepLabel number={index + 1} name={name} />;
            const pin = <StepPin icon={icon} pointsUp={labelAbove} />;

            return (
              <li key={name} className="flex w-44 flex-col items-center">
                <div className="flex h-32 items-end">
                  {labelAbove ? <div className="pb-6">{label}</div> : pin}
                </div>
                <span
                  aria-hidden="true"
                  className="size-5 rounded-full bg-shade-100 outline-1 outline-offset-3 outline-shade-100"
                />
                <div className="flex h-32 items-start">
                  {labelAbove ? pin : <div className="pt-6">{label}</div>}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
