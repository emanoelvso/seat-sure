import {
  AltArrowRightIcon,
  CheckCircleIcon,
  TicketIcon,
  WalletMoneyIcon,
} from "@solar-icons/react/outline";
import { Icon } from "@solar-icons/react/lib/types";
import { createElement } from "react";

export type CheckoutStep = "tickets" | "payment" | "review";

interface StepDef {
  step: CheckoutStep;
  label: string;
  icon: Icon;
}

const STEPS: StepDef[] = [
  { step: "tickets", label: "Tickets", icon: TicketIcon },
  { step: "payment", label: "Payment", icon: WalletMoneyIcon },
  { step: "review", label: "Review", icon: CheckCircleIcon },
];

interface CheckoutStepsProps {
  current: CheckoutStep;
}

// PAY-04, PAY-18, PAY-24, PAY-33: the three checkout steps, none clickable.
// Moving back uses the page's own "Back" button, not these.
export function CheckoutSteps({ current }: CheckoutStepsProps) {
  return (
    <nav
      aria-label="Checkout steps"
      className="flex items-center justify-center gap-4 border-y border-neutral-500 py-4"
    >
      {STEPS.map(({ step, label, icon }, index) => {
        const isCurrent = step === current;

        return (
          <div key={step} className="flex items-center gap-4">
            <span
              aria-current={isCurrent ? "step" : undefined}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium ${
                isCurrent ? "border border-primary text-tint-500" : "text-white"
              }`}
            >
              {createElement(icon, { size: 18 })}
              {label}
            </span>
            {index < STEPS.length - 1 && (
              <AltArrowRightIcon
                size={16}
                aria-hidden="true"
                className="text-white"
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
