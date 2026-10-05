import { Checkbox as RadixCheckbox } from "radix-ui";
import { useId } from "react";

interface CheckboxProps {
  label: string;
  name?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export function Checkbox({
  label,
  name,
  checked,
  defaultChecked,
  onCheckedChange,
}: CheckboxProps) {
  const id = useId();

  return (
    <div className="flex items-center gap-2">
      <RadixCheckbox.Root
        id={id}
        name={name}
        checked={checked}
        defaultChecked={defaultChecked}
        onCheckedChange={onCheckedChange}
        className="flex h-5 w-5 items-center justify-center rounded border border-neutral-800 bg-neutral-700 outline-none data-[state=checked]:border-primary data-[state=checked]:bg-primary"
      >
        <RadixCheckbox.Indicator className="text-white">
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M2 6L5 9L10 3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </RadixCheckbox.Indicator>
      </RadixCheckbox.Root>
      <label htmlFor={id} className="text-sm text-neutral-200 cursor-pointer">
        {label}
      </label>
    </div>
  );
}
