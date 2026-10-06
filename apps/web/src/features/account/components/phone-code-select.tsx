"use client";

import { AltArrowDownIcon } from "@solar-icons/react/outline";
import { Select } from "radix-ui";
import type { ReactNode } from "react";
import { FranceIcon } from "@/components/icons/france-icon";
import { GermanyIcon } from "@/components/icons/germany-icon";
import { SpainIcon } from "@/components/icons/spain-icon";
import { UsaIcon } from "@/components/icons/usa-icon";
import {
  PHONE_COUNTRY_CODES,
  type PhoneCountry,
} from "@/features/account/utils/personal-info-schema";

const FLAGS: Record<PhoneCountry, ReactNode> = {
  us: <UsaIcon />,
  de: <GermanyIcon />,
  es: <SpainIcon />,
  fr: <FranceIcon />,
};

interface PhoneCodeSelectProps {
  value: string;
  onChange: (code: string) => void;
  invalid?: boolean;
}

// Phone country code menu (PROFILE-07), from Figma 5011:120591 (trigger,
// 119x56) and the open menu 5011:120756 (119px wide, 8px below the trigger,
// 16px item gap). Radix Select gives the keyboard and ARIA behavior.
export function PhoneCodeSelect({
  value,
  onChange,
  invalid,
}: PhoneCodeSelectProps) {
  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger
        aria-label="Phone country code"
        aria-invalid={invalid || undefined}
        className={`flex h-14 w-[119px] shrink-0 cursor-pointer items-center justify-between gap-2 rounded-lg border bg-neutral-700 p-4 text-base leading-[120%] font-medium text-white outline-none focus-visible:border-primary ${invalid ? "border-error-400" : "border-transparent"}`}
      >
        <span className="flex items-center gap-2">
          <Select.Value />
        </span>
        <Select.Icon className="flex">
          <AltArrowDownIcon size={24} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={8}
          className="z-50 w-(--radix-select-trigger-width) rounded-lg bg-neutral-700 py-4"
        >
          <Select.Viewport className="flex flex-col gap-4">
            {PHONE_COUNTRY_CODES.map(({ code, country }) => (
              <Select.Item
                key={code}
                value={code}
                className="flex cursor-pointer items-center px-4 py-2 text-base leading-[120%] font-medium text-white outline-none select-none data-[highlighted]:bg-neutral-500 data-[state=checked]:bg-neutral-500"
              >
                <Select.ItemText>
                  <span className="flex items-center gap-2">
                    {FLAGS[country]}
                    {code}
                  </span>
                </Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
