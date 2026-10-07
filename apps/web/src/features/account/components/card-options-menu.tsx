"use client";

import { MenuDotsIcon } from "@solar-icons/react/outline";
import { DropdownMenu } from "radix-ui";
import { brandLabel, type CardBrand } from "@/utils/card";

interface CardOptionsMenuProps {
  brand: string;
  last4: string;
  isDefault: boolean;
  onSetDefault: () => void;
  onRemove: () => void;
}

const ITEM_CLASS =
  "flex h-8 cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-base text-white outline-none select-none data-[highlighted]:bg-neutral-700";

// Card menu (CARD-10 AC 1-3): "Set as default" only for a non-default card,
// then "Remove". Same surface as OrderSortMenu's list.
export function CardOptionsMenu({
  brand,
  last4,
  isDefault,
  onSetDefault,
  onRemove,
}: CardOptionsMenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={`Card options for ${brandLabel(brand as CardBrand)} ending in ${last4}`}
        className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-white outline-none hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-tint-400 data-[state=open]:bg-white/10"
      >
        <MenuDotsIcon size={24} aria-hidden />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 flex w-[206px] flex-col gap-4 rounded-2xl bg-neutral-800 p-4"
        >
          {!isDefault && (
            <DropdownMenu.Item className={ITEM_CLASS} onSelect={onSetDefault}>
              Set as default
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Item className={ITEM_CLASS} onSelect={onRemove}>
            Remove
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
