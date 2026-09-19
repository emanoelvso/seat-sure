"use client";
import { Popover } from "radix-ui";
import { Icon } from "@solar-icons/react/lib/types";
import { createElement, useState } from "react";
import { CheckCircleIcon } from "@solar-icons/react/outline";

interface ComboBoxProps {
  options: string[];
  value?: string | undefined;
  onChange: (value: string | undefined) => void;
  label?: string;
  placeholder?: string;
  leftIcon?: Icon;
}

export default function ComboBox({
  options,
  value,
  onChange,
  label,
  placeholder,
  leftIcon,
}: ComboBoxProps) {
  const [open, setOpen] = useState(false);

  const filtered = value
    ? options.filter((o) => o.toLowerCase().includes(value.toLowerCase()))
    : options;

  function handleSelect(city: string) {
    onChange(city);
    setOpen(false);
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <div className="w-full max-w-xl flex flex-col gap-1">
        <fieldset className="relative w-full bg-neutral-700 border rounded-lg border-neutral-800">
          {label && (
            <legend className="ml-3 px-1 text-xs text-neutral-200 leading-none">
              {label}
            </legend>
          )}
          <Popover.Anchor asChild>
            <div className="relative flex items-center">
              {leftIcon &&
                createElement(leftIcon, {
                  className:
                    "absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-300",
                  size: 18,
                })}
              <input
                type="text"
                value={value ?? ""}
                placeholder={placeholder}
                onChange={(e) => {
                  onChange(e.target.value);
                  setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                className={`w-full bg-transparent outline-none text-white placeholder:text-neutral-400 text-sm ${leftIcon ? "pl-12" : "pl-4"} pr-4 py-2`}
              />
            </div>
          </Popover.Anchor>
        </fieldset>
      </div>

      <Popover.Portal>
        <Popover.Content
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={() => setOpen(false)}
          sideOffset={4}
          className="min-w-[var(--radix-popover-trigger-width)] max-h-60 overflow-y-auto rounded-lg border border-neutral-800 bg-neutral-950 shadow-lg z-50"
        >
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-neutral-500">
              No cities found
            </p>
          ) : (
            <div className="p-1">
              {filtered.map((city) => (
                <button
                  key={city}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(city);
                  }}
                  className="flex items-center justify-between w-full px-3 py-2 text-sm text-neutral-200 rounded-md cursor-pointer outline-none hover:bg-neutral-800 hover:text-white"
                >
                  {city}
                  {value?.toLowerCase() === city.toLowerCase() && (
                    <CheckCircleIcon size={16} />
                  )}
                </button>
              ))}
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
