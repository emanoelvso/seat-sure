"use client";

import { AddCircleIcon } from "@solar-icons/react/outline";
import type { PaymentCard } from "@/features/account/api/find-my-payment-cards";
import { SavedCard } from "@/features/account/components/saved-card";

export const MAX_SAVED_CARDS = 5;

interface SavedCardListProps {
  /** Already ordered by the API: default first, then oldest saved first. */
  cards: PaymentCard[];
  onAdd: () => void;
  onSetDefault: (cardId: string) => void;
  onRemove: (cardId: string) => void | Promise<void>;
}

// The right column of Figma 5011:121856: the saved cards, 32px apart, then
// the dashed "Add payment method" tile (5011:121858, 425x230, a 40px Add
// Circle icon 8px above 16px medium neutral-100 text). At the limit the
// tile is disabled and says why (CARD-04 AC 11).
// SPEC_DEVIATION: the tile's fill, stroke, and radius could not be read
// (figwright errors on this component set); they follow the rendered frame:
// neutral-600 fill, neutral-300 dashed border, and the card's 16px radius.
// Reason: get_design_context fails with "Component set has existing errors".
export function SavedCardList({
  cards,
  onAdd,
  onSetDefault,
  onRemove,
}: SavedCardListProps) {
  const full = cards.length >= MAX_SAVED_CARDS;

  return (
    <div className="flex w-full max-w-[425px] flex-col gap-8">
      {cards.length > 0 && (
        <ul aria-label="Saved cards" className="flex flex-col gap-8">
          {cards.map((card) => (
            <li key={card.id}>
              <SavedCard
                card={card}
                onSetDefault={onSetDefault}
                onRemove={onRemove}
              />
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        disabled={full}
        onClick={onAdd}
        className="flex aspect-[425/230] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-600 px-[75px] text-base font-medium text-neutral-100 hover:border-neutral-200 focus-visible:outline-2 focus-visible:outline-tint-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <AddCircleIcon size={40} aria-hidden />
        {full ? "You can save up to 5 cards." : "Add payment method"}
      </button>
    </div>
  );
}
