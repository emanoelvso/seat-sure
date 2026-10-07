"use client";

import { useRef, useState } from "react";
import { addPaymentCardAction } from "@/features/account/api/add-payment-card-action";
import type { PaymentCard } from "@/features/account/api/find-my-payment-cards";
import {
  removePaymentCardAction,
  setDefaultPaymentCardAction,
  type PaymentCardActionResult,
} from "@/features/account/api/payment-card-actions";
import {
  AddCardForm,
  type AddCardFormHandle,
} from "@/features/account/components/add-card-form";
import { PaymentEmptyState } from "@/features/account/components/payment-empty-state";
import { PaymentMethodButtons } from "@/features/account/components/payment-method-buttons";
import { SavedCardList } from "@/features/account/components/saved-card-list";

type CardAction = (cardId: string) => Promise<PaymentCardActionResult>;

interface PaymentViewProps {
  cards: PaymentCard[];
  // Default to the real Server Actions; Storybook passes fakes so play()
  // can drive the page without a server.
  addAction?: typeof addPaymentCardAction;
  setDefaultAction?: CardAction;
  removeAction?: CardAction;
}

// The payment page body (CARD-01, CARD-03, CARD-10, CARD-11). It holds the
// list and replaces it with whatever each action returns; the API orders it,
// so it is never re-sorted here. With no card and before "Add new card" it
// is the empty state (Figma 5011:121776: the content card with 189/242
// padding, centered); otherwise the payment methods layout (5011:121837:
// 40px padding; heading block 5011:121840, 48px above the row 5011:121845,
// whose two columns sit at either end: space-between, so Figma's 144px
// item spacing does not apply).
export function PaymentView({
  cards: initialCards,
  addAction = addPaymentCardAction,
  setDefaultAction = setDefaultPaymentCardAction,
  removeAction = removePaymentCardAction,
}: PaymentViewProps) {
  const [cards, setCards] = useState(initialCards);
  const [adding, setAdding] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const formRef = useRef<AddCardFormHandle>(null);

  function applyResult(result: PaymentCardActionResult) {
    if ("error" in result) {
      // CARD-11 AC 11: keep the list as it is.
      setError(result.error);
      return;
    }
    // CARD-10 AC 4, 7-9 and CARD-11 AC 10 (a not-found result carries the
    // reloaded list): the API's list replaces ours.
    setError("");
    setCards(result.cards);
    if (result.cards.length === 0) setAdding(false);
  }

  async function handleSetDefault(cardId: string) {
    setStatus("");
    applyResult(await setDefaultAction(cardId));
  }

  async function handleRemove(cardId: string) {
    setStatus("");
    applyResult(await removeAction(cardId));
  }

  function handleSaved(saved: PaymentCard[]) {
    setError("");
    setCards(saved);
    setStatus("Card saved.");
  }

  function handleAddTile() {
    setStatus("");
    formRef.current?.reset();
  }

  if (cards.length === 0 && !adding) {
    return (
      <section className="mt-0.5 flex min-h-[793px] flex-col items-center justify-center gap-2 rounded-3xl bg-neutral-1000 px-[242px] py-[189px]">
        <h1 className="sr-only">Payment</h1>
        <PaymentEmptyState onAdd={() => setAdding(true)} />
      </section>
    );
  }

  return (
    <section className="mt-0.5 flex min-h-[793px] flex-col gap-12 rounded-3xl bg-neutral-1000 p-10">
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2 pb-4">
          <h1 className="grow text-2xl font-bold text-white">
            Payment methods
          </h1>
          <p role="status" className="text-sm text-success-300">
            {status}
          </p>
          {error && (
            <p role="alert" className="text-sm text-error-300">
              {error}
            </p>
          )}
        </div>
        <hr className="border-neutral-600" />
      </div>
      <div className="flex items-center justify-between gap-8">
        <div className="flex w-[556px] flex-col gap-12">
          <PaymentMethodButtons />
          <AddCardForm
            ref={formRef}
            action={addAction}
            isFirstCard={cards.length === 0}
            onSaved={handleSaved}
          />
        </div>
        <SavedCardList
          cards={cards}
          onAdd={handleAddTile}
          onSetDefault={handleSetDefault}
          onRemove={handleRemove}
        />
      </div>
    </section>
  );
}
