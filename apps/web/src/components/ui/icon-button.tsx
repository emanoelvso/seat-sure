import { createElement } from "react";
import { Icon } from "@solar-icons/react/lib/types";

interface IconButtonProps {
  icon: Icon;
  label: string;
}
export function IconButton({ icon, label }: IconButtonProps) {
  return (
    <button aria-label={label} className="p-3 inline-flex items-center cursor-pointer justify-center rounded-lg gap-2 transition-colors focus-visible:outline-none disabled:text-neutral-300 disabled:pointer-events-none text-base leading-[120%] bg-primary hover:bg-tint-400 disabled:bg-neutral-900 text-white active:bg-tint-600">
      {createElement(icon, { size: 24 })}
    </button>
  );
}
