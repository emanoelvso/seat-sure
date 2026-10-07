import {
  brandLabel,
  detectBrand,
  maskedNumber,
} from "@/utils/card";

interface CardPreviewProps {
  number: string;
  holder: string;
  expiry: string;
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

// PAY-32: the live "Add Payment methods" credit-card preview. Purely
// visual, so it is hidden from assistive technology apart from a short
// summary of the card's last 4 digits.
export function CardPreview({ number, holder, expiry }: CardPreviewProps) {
  const digits = number.replace(/\D/g, "");
  const last4 = digits.length >= 4 ? digits.slice(-4) : null;

  return (
    <div>
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
          <span className="text-xl font-bold italic">
            {brandLabel(detectBrand(number))}
          </span>
        </div>
        <p className="text-right text-2xl tracking-[0.2em]">
          {maskedNumber(number)}
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
    </div>
  );
}
