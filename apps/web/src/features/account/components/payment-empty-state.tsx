import Image from "next/image";
import { AddCircleIcon } from "@solar-icons/react/outline";
import { Button } from "@/components/ui/button";

interface PaymentEmptyStateProps {
  onAdd: () => void;
}

// Empty state of the payment page (CARD-01 AC 1), from Figma 5011:121777.
// The card illustration is the frame's raster image fill (512x512 PNG),
// shown at 250px.
export function PaymentEmptyState({ onAdd }: PaymentEmptyStateProps) {
  return (
    <div className="flex w-[644px] max-w-full flex-col items-center gap-6">
      <div className="flex w-full flex-col items-center gap-6">
        <Image
          src="/account/payment-empty.png"
          alt=""
          width={250}
          height={250}
        />
        <div className="flex w-full flex-col items-center gap-6 text-center">
          <h2 className="w-full text-2xl font-medium text-white">
            You haven’t added a card yet!
          </h2>
          <p className="w-full text-xl text-neutral-100">
            Add one now so you can complete your payment and get your ticket
          </p>
        </div>
      </div>
      {/* SPEC_DEVIATION: Figma's primary "Fill" button is white on #C14FE6
          (primary), 3.8:1, below WCAG AA for 16px text. Reason: tint-600,
          the button's own pressed shade, gives 5.4:1 (as OrdersEmptyState). */}
      <Button
        type="button"
        leftIcon={AddCircleIcon}
        iconSize={24}
        onClick={onAdd}
        className="w-[182px] bg-tint-600! hover:bg-shade-100! active:bg-shade-100!"
      >
        Add new card
      </Button>
    </div>
  );
}
