"use client";

import { useState } from "react";
import { CardPreview } from "@/components/card-preview";
import type { PaymentCard } from "@/features/account/api/find-my-payment-cards";
import { CardOptionsMenu } from "@/features/account/components/card-options-menu";
import { RemoveCardDialog } from "@/features/account/components/remove-card-dialog";
import { formatExpiry } from "@/utils/card";

interface SavedCardProps {
  card: PaymentCard;
  onSetDefault: (cardId: string) => void;
  /** Awaited while the dialog shows "Removing…"; the dialog closes after. */
  onRemove: (cardId: string) => void | Promise<void>;
}

const BADGE_CLASS = "rounded-xl px-3 py-1 text-xs font-medium";

// A saved card (CARD-01 AC 4-6, CARD-10): the Figma Credit Card visual
// (5011:121857) with the "Default" and "Expired" badges and the card menu
// over its empty right side, beside the chip and brand row. No frame shows
// the badges, so they use solid fills that keep their text readable over
// the gradient.
export function SavedCard({ card, onSetDefault, onRemove }: SavedCardProps) {
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removing, setRemoving] = useState(false);

  async function handleConfirm() {
    setRemoving(true);
    try {
      await onRemove(card.id);
    } finally {
      setRemoving(false);
      setRemoveOpen(false);
    }
  }

  return (
    <>
      <CardPreview
        brand={card.brand}
        last4={card.last4}
        holder={card.holder}
        expiry={formatExpiry(card.expMonth, card.expYear)}
      >
        <div className="absolute top-1/4 right-4 flex items-center gap-2">
          {card.isDefault && (
            <span className={`${BADGE_CLASS} bg-white text-tint-600`}>
              Default
            </span>
          )}
          {card.expired && (
            <span className={`${BADGE_CLASS} bg-error-500 text-white`}>
              Expired
            </span>
          )}
          <CardOptionsMenu
            brand={card.brand}
            last4={card.last4}
            isDefault={card.isDefault}
            onSetDefault={() => onSetDefault(card.id)}
            onRemove={() => setRemoveOpen(true)}
          />
        </div>
      </CardPreview>
      <RemoveCardDialog
        open={removeOpen}
        brand={card.brand}
        last4={card.last4}
        pending={removing}
        onCancel={() => setRemoveOpen(false)}
        onConfirm={handleConfirm}
      />
    </>
  );
}
