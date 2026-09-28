"use client";

import { AltArrowDownIcon } from "@solar-icons/react/outline";
import { Popover } from "radix-ui";
import { FormEvent, useId, useState } from "react";
import Button from "@/components/Button";
import { subCategoriePillVariant } from "@/components/SubCategoriePill";
import { formatPrice } from "@/lib/utils/price";
import { PriceRange } from "@/lib/utils/ticket-listings";

interface PriceRangeFilterProps {
  value: PriceRange;
  onApply: (range: PriceRange) => void;
}

const inputClassName =
  "w-24 rounded-lg border border-neutral-500 bg-neutral-700 px-3 py-2 text-sm text-white outline-none focus-visible:border-tint-400";

export default function PriceRangeFilter({
  value,
  onApply,
}: PriceRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const [min, setMin] = useState(String(value.min));
  const [max, setMax] = useState(String(value.max));
  const [invalid, setInvalid] = useState(false);
  const minId = useId();
  const maxId = useId();

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setMin(String(value.min));
      setMax(String(value.max));
      setInvalid(false);
    }
    setOpen(nextOpen);
  }

  function handleApply(event: FormEvent) {
    event.preventDefault();
    const range = { min: Number(min), max: Number(max) };

    if (range.min > range.max) {
      setInvalid(true);
      return;
    }

    onApply(range);
    setOpen(false);
  }

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger
        className={`${subCategoriePillVariant({ size: "sm" })} outline-none focus-visible:ring-2 focus-visible:ring-tint-400`}
      >
        {formatPrice(value.min * 100)} - {formatPrice(value.max * 100)}
        <AltArrowDownIcon size={16} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          className="z-50 rounded-lg border border-neutral-500 bg-neutral-800 p-4 shadow-lg"
        >
          <form onSubmit={handleApply} className="flex flex-col gap-3">
            <div className="flex items-end gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor={minId} className="text-xs text-neutral-100">
                  Min
                </label>
                <input
                  id={minId}
                  type="number"
                  min={0}
                  step={1}
                  value={min}
                  onChange={(event) => setMin(event.target.value)}
                  className={inputClassName}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor={maxId} className="text-xs text-neutral-100">
                  Max
                </label>
                <input
                  id={maxId}
                  type="number"
                  min={0}
                  step={1}
                  value={max}
                  onChange={(event) => setMax(event.target.value)}
                  className={inputClassName}
                />
              </div>
              <Button type="submit" size="sm">
                Apply
              </Button>
            </div>
            {invalid && (
              <p role="alert" className="text-xs text-error-200">
                Min can&apos;t exceed max
              </p>
            )}
          </form>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
