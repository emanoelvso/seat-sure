import { Icon } from "@solar-icons/react/lib/types";
import { createElement } from "react";

interface InputProps {
  label?: string;
  leftIcon?: Icon;
  rightIcon?: Icon;
  supportingText?: string;
  counter?: number;
  success?: boolean;
  error?: boolean;
}

export default function Input({
  label,
  leftIcon,
  rightIcon,
  supportingText,
  counter,
  success,
  error,
}: InputProps) {
  return (
    <div className="w-full max-w-xl flex flex-col gap-1">
      <fieldset className="relative w-full bg-neutral-700 border border-neutral-800 rounded-lg">
        {label && (
          <legend className="ml-3 px-1 text-xs text-neutral-200 leading-none">
            {label}
          </legend>
        )}
        {leftIcon &&
          createElement(leftIcon, {
            className:
              "absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-300",
            size: 18,
          })}
        <input
          type="text"
          placeholder="Search events, artists..."
          className={`w-full bg-transparent ${leftIcon ? "pl-12" : "pl-4"} ${rightIcon ? "pr-12" : "pr-4"} py-2 text-sm text-white outline-none placeholder:text-neutral-300`}
        />
        {rightIcon && (
          <button
            type="button"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-300 hover:text-white"
          >
            {createElement(rightIcon, { size: 18 })}
          </button>
        )}
      </fieldset>
      <div className="flex justify-between text-xs text-neutral-400">
        <span>Supporting text</span>
        <span>10/20</span>
      </div>
    </div>
  );
}
