import type { ReactNode } from "react";
import {
  brandLabel,
  detectBrand,
  maskedNumber,
  type CardBrand,
} from "@/utils/card";

// A typed card passes `number`; a saved card has no full number, so it
// passes `brand` and `last4`, which win over `number` (CARD-01 AC 4).
interface CardPreviewProps {
  number?: string;
  brand?: string;
  last4?: string;
  holder: string;
  expiry: string;
  // Rendered over the card, outside the decorative visual, so badges and
  // menu buttons stay accessible
  children?: ReactNode;
}

// The Visa wordmark from the Figma credit card (I5011:121857;4511:56759)
function VisaLogo() {
  return (
    <svg
      role="img"
      aria-label="Visa"
      width="55"
      height="17"
      viewBox="0 0 55 17"
      fill="none"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M13.7505 16.8662H8.9906L5.42128 3.67813C5.25186 3.07148 4.89215 2.53516 4.36302 2.28239C3.04251 1.64716 1.5874 1.14162 0 0.886649V0.378906H7.66777C8.72603 0.378906 9.51973 1.14162 9.65201 2.02742L11.504 11.5404L16.2615 0.378906H20.8891L13.7505 16.8662ZM23.5351 16.8662H19.0398L22.7414 0.378906H27.2367L23.5351 16.8662ZM33.0527 4.94774C33.185 4.05974 33.9787 3.552 34.9047 3.552C36.3598 3.42451 37.9449 3.67948 39.2677 4.31251L40.0614 0.762713C38.7386 0.25497 37.2835 0 35.963 0C31.5999 0 28.4252 2.28374 28.4252 5.45329C28.4252 7.86451 30.674 9.13057 32.2614 9.89328C33.9787 10.6538 34.6401 11.1615 34.5078 11.9221C34.5078 13.0628 33.185 13.5706 31.8645 13.5706C30.2771 13.5706 28.6897 13.1903 27.2369 12.5551L26.4432 16.1071C28.0306 16.7401 29.748 16.9951 31.3354 16.9951C36.2275 17.1204 39.2677 14.8388 39.2677 11.4143C39.2677 7.1018 33.0527 6.84903 33.0527 4.94774ZM54.9992 16.8662L51.4298 0.378906H47.596C46.8023 0.378906 46.0086 0.886649 45.744 1.64716L39.1345 16.8662H43.7621L44.6857 14.4572H50.3716L50.9007 16.8662H54.9992ZM48.2582 4.81836L49.5788 11.0322H45.8771L48.2582 4.81836Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ContactlessIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <path d="M7 9a4 4 0 0 1 0 6" />
      <path d="M10.5 6.5a8 8 0 0 1 0 11" />
      <path d="M14 4a12 12 0 0 1 0 16" />
    </svg>
  );
}

function ChipIcon() {
  return (
    <svg width="50" height="38" viewBox="0 0 50 38" fill="none">
      <rect x="1" y="1" width="48" height="36" rx="6" fill="#e8b25c" />
      <path
        d="M1 13h14m20 0h14M1 25h14m20 0h14M15 1v36m20-36v36M15 19h20"
        stroke="#9c6a1e"
        strokeWidth="1.5"
      />
    </svg>
  );
}

// PAY-32: the live "Add Payment methods" credit-card preview, and a saved
// card's visual (CARD-01 AC 4). Purely visual, so it is hidden from
// assistive technology apart from a short summary of the card's last 4
// digits.
export function CardPreview({
  number = "",
  brand,
  last4: savedLast4,
  holder,
  expiry,
  children,
}: CardPreviewProps) {
  const digits = number.replace(/\D/g, "");
  const last4 = savedLast4 ?? (digits.length >= 4 ? digits.slice(-4) : null);
  const saved = brand !== undefined && savedLast4 !== undefined;

  return (
    <div className="relative w-full max-w-[425px]">
      {last4 && <p className="sr-only">Card ending in {last4}</p>}
      <div
        aria-hidden="true"
        className="relative flex aspect-[425/230] w-full max-w-[425px] flex-col justify-between overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_85%_10%,var(--color-tint-400),var(--color-tint-600)_35%,var(--color-shade-200)_70%,var(--color-shade-400))] p-4 text-white"
      >
        <div className="flex items-center justify-between">
          <span className="text-xl">Credit Card</span>
          <ContactlessIcon />
        </div>
        <div className="flex items-center gap-3">
          <ChipIcon />
          {saved && brand === "visa" ? (
            <VisaLogo />
          ) : (
            <span className="text-xl font-bold italic">
              {brandLabel(saved ? (brand as CardBrand) : detectBrand(number))}
            </span>
          )}
        </div>
        <p className="text-right text-2xl tracking-[0.2em]">
          {saved ? `•••• •••• •••• ${savedLast4}` : maskedNumber(number)}
        </p>
        <div className="flex items-end justify-between gap-4 text-xs">
          <div className="flex min-w-0 flex-col gap-2">
            <span className="text-neutral-100">CardHolder Name</span>
            <span className="truncate">{holder || "Cardholder Name"}</span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-neutral-100">Expiry date</span>
            <span>{expiry ? expiry.replace("/", " / ") : "MM / YY"}</span>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
