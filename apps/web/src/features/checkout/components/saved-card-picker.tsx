"use client";

import { AddCircleIcon, CardIcon } from "@solar-icons/react/outline";
import { RadioGroup } from "radix-ui";
import { useId, useState, type ReactNode } from "react";
import { VisaIcon } from "@/components/icons/visa-icon";
import { Button } from "@/components/ui/button";
import type { CheckoutPaymentCard } from "@/features/checkout/api/find-checkout-payment-cards";
import { brandLabel, formatExpiry, type CardBrand } from "@/utils/card";

export const NEW_CARD = "new";

interface SavedCardPickerProps {
  /** Ordered by the API: default first, then oldest saved first. */
  cards: CheckoutPaymentCard[];
  onConfirm: (choice: string) => void;
  /** Shown in an alert above "Confirm" (e.g. a card that is gone). */
  error?: string;
}

// CARD-07 AC 2: the default card unless it is expired, else nothing.
function initialChoice(cards: CheckoutPaymentCard[]) {
  const preferred = cards.find((card) => card.isDefault);
  return preferred && !preferred.expired ? preferred.id : "";
}

function BrandMark({ brand }: { brand: string }) {
  if (brand === "visa") return <VisaIcon />;
  return (
    <span className="flex h-6 w-[35px] items-center justify-center text-neutral-100">
      <CardIcon size={24} aria-hidden />
    </span>
  );
}

function Row({
  value,
  disabled,
  mark,
  label,
  detail,
  expired,
}: {
  value: string;
  disabled?: boolean;
  mark: ReactNode;
  label: string;
  detail?: string;
  expired?: boolean;
}) {
  const labelId = useId();
  const detailId = useId();

  return (
    <RadioGroup.Item
      value={value}
      disabled={disabled}
      aria-labelledby={labelId}
      aria-describedby={detail ? detailId : undefined}
      className="group flex w-full cursor-pointer items-center gap-3 rounded-2xl bg-neutral-1000 p-6 text-left outline-none focus-visible:outline-2 focus-visible:outline-tint-400 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-neutral-500 bg-neutral-900">
        <RadioGroup.Indicator className="size-3.5 rounded-full bg-primary" />
      </span>
      <span aria-hidden="true" className="flex shrink-0">
        {mark}
      </span>
      <span className="flex grow flex-col gap-1">
        <span
          id={labelId}
          className="text-base leading-[1.2] font-medium text-white"
        >
          {label}
        </span>
        {detail && (
          <span id={detailId} className="text-sm text-neutral-100">
            {detail}
          </span>
        )}
      </span>
      {expired && (
        <span className="rounded-xl bg-error-500 px-3 py-1 text-xs font-medium text-white">
          Expired
        </span>
      )}
    </RadioGroup.Item>
  );
}

// The checkout Payment step's method picker (CARD-07 AC 1-4), adapted from
// Figma 4417:291838 ("Final combo" 4417:291843): the 24px medium heading,
// 32px, the rows 16px apart (each a neutral-1000, 16px-radius card with 24px
// padding, a 24px radio, the 35x24 brand mark and 16px medium text, 12px
// apart), 32px, then the full-width 56px "Confirm". The frame's wallet rows
// become the saved cards and a "New card" row.
export function SavedCardPicker({
  cards,
  onConfirm,
  error,
}: SavedCardPickerProps) {
  const headingId = useId();
  const [choice, setChoice] = useState(() => initialChoice(cards));

  // A reloaded list may no longer hold the chosen card.
  const selectable =
    choice === NEW_CARD ||
    cards.some((card) => card.id === choice && !card.expired);
  const value = selectable ? choice : "";

  return (
    <div className="flex flex-col gap-8">
      <h2 id={headingId} className="text-2xl font-medium text-white">
        Select payment method
      </h2>
      <RadioGroup.Root
        aria-labelledby={headingId}
        value={value}
        onValueChange={setChoice}
        className="flex flex-col gap-4"
      >
        {cards.map((card) => (
          <Row
            key={card.id}
            value={card.id}
            disabled={card.expired}
            expired={card.expired}
            mark={<BrandMark brand={card.brand} />}
            label={`${brandLabel(card.brand as CardBrand)} •••• ${card.last4}`}
            detail={`Expires ${formatExpiry(card.expMonth, card.expYear)}`}
          />
        ))}
        <Row
          value={NEW_CARD}
          mark={
            <span className="flex h-6 w-[35px] items-center justify-center text-neutral-100">
              <AddCircleIcon size={24} aria-hidden />
            </span>
          }
          label="New card"
        />
      </RadioGroup.Root>
      {error && (
        <p role="alert" className="text-sm text-error-300">
          {error}
        </p>
      )}
      {/* SPEC_DEVIATION: Figma's "Fill" button is white on primary #C14FE6,
          3.8:1, below WCAG AA for 16px text. Reason: tint-600 gives 5.4:1
          (as the account payment buttons). */}
      <Button
        type="button"
        size="xl"
        disabled={!value}
        onClick={() => onConfirm(value)}
        className="w-full bg-tint-600! hover:bg-shade-100! active:bg-shade-100! disabled:bg-neutral-900!"
      >
        Confirm
      </Button>
    </div>
  );
}
