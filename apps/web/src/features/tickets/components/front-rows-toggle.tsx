"use client";

import { subCategoriePillVariant } from "@/components/ui/sub-categorie-pill";

interface FrontRowsToggleProps {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
}

export function FrontRowsToggle({
  pressed,
  onPressedChange,
}: FrontRowsToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => onPressedChange(!pressed)}
      className={`${subCategoriePillVariant({ size: "sm", variant: pressed ? "active" : "default" })} outline-none focus-visible:ring-2 focus-visible:ring-tint-400`}
    >
      Front rows
    </button>
  );
}
