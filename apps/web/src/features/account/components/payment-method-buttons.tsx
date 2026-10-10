import type { ReactNode } from "react";
import { ApplePayIcon } from "@/components/icons/apple-pay-icon";
import { BitpayIcon } from "@/components/icons/bitpay-icon";
import { GooglePayIcon } from "@/components/icons/google-pay-icon";
import { VisaIcon } from "@/components/icons/visa-icon";

const BUTTON_CLASS =
  "flex h-14 w-20 items-center justify-center rounded-lg border border-neutral-300 px-[17px] py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tint-400";

const METHODS: { label: string; icon: ReactNode; selected: boolean }[] = [
  { label: "Apple Pay", icon: <ApplePayIcon />, selected: false },
  { label: "Card", icon: <VisaIcon />, selected: true },
  { label: "bitpay", icon: <BitpayIcon />, selected: false },
  { label: "Google Pay", icon: <GooglePayIcon />, selected: false },
];

// Payment method row (CARD-03 AC 16), from Figma 5011:121847. Only the card
// method exists: it is pressed, and the wallets are shown but disabled.
// Disabled ones use aria-disabled (not `disabled`) so they stay focusable
// and announced, and they have no handler.
export function PaymentMethodButtons() {
  return (
    <div className="flex items-center gap-10">
      {METHODS.map(({ label, icon, selected }) => (
        <button
          key={label}
          type="button"
          aria-label={label}
          {...(selected
            ? { "aria-pressed": true }
            : { "aria-disabled": true })}
          className={`${BUTTON_CLASS} ${selected ? "cursor-pointer" : "cursor-not-allowed"}`}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}
