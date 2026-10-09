"use client";

import { useId, type ReactNode } from "react";
import { Switch } from "radix-ui";

interface SettingCardProps {
  title: string;
  description: ReactNode;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}

// Figma source 4136:42972 and switch 3799:28526. The source uses
// SPACE_BETWEEN; its measured free space is not a fixed CSS gap.
export function SettingCard({
  title,
  description,
  checked,
  disabled,
  onCheckedChange,
}: SettingCardProps) {
  const id = useId();
  return (
    <div className="flex min-h-24 w-full items-center justify-between gap-6 rounded-2xl bg-neutral-900 p-4">
      <div className="flex min-w-0 flex-col gap-4">
        <p
          id={`${id}-title`}
          className="text-lg leading-[22px] font-bold text-white"
        >
          {title}
        </p>
        <p
          id={`${id}-description`}
          className="text-base leading-[19px] text-neutral-200"
        >
          {description}
        </p>
      </div>
      <Switch.Root
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        className="flex h-7 w-[50px] shrink-0 cursor-pointer items-center rounded-full bg-neutral-400 p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-tint-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 disabled:cursor-wait data-[state=checked]:bg-primary"
      >
        <Switch.Thumb className="block size-6 rounded-full bg-white shadow-[-6px_0_6px_-4px_#00000033] data-[state=checked]:translate-x-[22px]" />
      </Switch.Root>
    </div>
  );
}
