"use client";

import { AltArrowDownIcon } from "@solar-icons/react/outline";
import { Popover } from "radix-ui";
import { Checkbox } from "@/components/ui/checkbox";
import { subCategoriePillVariant } from "@/components/ui/sub-categorie-pill";
import { perkLabel, SEAT_PERKS } from "@/features/tickets/utils/seat-filters";
import type { SeatPerk } from "@/types/__generated__/graphql";

interface PerksFilterProps {
  value: SeatPerk[];
  onChange: (perks: SeatPerk[]) => void;
}

export function PerksFilter({ value, onChange }: PerksFilterProps) {
  function toggle(perk: SeatPerk, checked: boolean) {
    onChange(
      SEAT_PERKS.filter((option) =>
        option === perk ? checked : value.includes(option),
      ),
    );
  }

  return (
    <Popover.Root>
      <Popover.Trigger
        className={`${subCategoriePillVariant({ size: "sm" })} outline-none focus-visible:ring-2 focus-visible:ring-tint-400`}
      >
        Perks
        <AltArrowDownIcon size={16} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          aria-label="Perks"
          align="start"
          sideOffset={8}
          className="z-50 flex flex-col gap-3 rounded-lg border border-neutral-500 bg-neutral-800 p-4 shadow-lg"
        >
          {SEAT_PERKS.map((perk) => (
            <Checkbox
              key={perk}
              label={perkLabel(perk)}
              checked={value.includes(perk)}
              onCheckedChange={(checked) => toggle(perk, checked)}
            />
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
