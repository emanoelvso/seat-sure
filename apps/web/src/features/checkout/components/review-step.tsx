import {
  DollarMinimalisticIcon,
  LetterIcon,
  UserCircleIcon,
} from "@solar-icons/react/outline";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export type ReviewError = "CARD_DECLINED" | "GENERIC";

interface ReviewStepProps {
  user: { firstName: string; lastName: string; email: string };
  totalLabel: string;
  pending: boolean;
  error?: ReviewError;
  onBack: () => void;
  onPay: () => void;
}

const ERROR_COPY: Record<ReviewError, string> = {
  CARD_DECLINED: "Your card was declined. Check the details or use another card.",
  GENERIC: "We couldn't process your payment. Try again.",
};

function Row({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <span aria-hidden="true" className="shrink-0">
        {icon}
      </span>
      {children}
    </li>
  );
}

// PAY-34, PAY-49, PAY-50, PAY-53: the contact details and total on a purple
// rule, then Back/Pay. No phone row (spec Assumptions).
export function ReviewStep({
  user,
  totalLabel,
  pending,
  error,
  onBack,
  onPay,
}: ReviewStepProps) {
  return (
    <div className="flex flex-col gap-8">
      <ul className="flex flex-col gap-4 border-l-2 border-primary pl-4 text-white">
        <Row icon={<UserCircleIcon size={22} />}>
          {user.firstName} {user.lastName}
        </Row>
        <Row icon={<LetterIcon size={22} />}>{user.email}</Row>
        <Row icon={<DollarMinimalisticIcon size={22} />}>
          Total price : {totalLabel}
        </Row>
      </ul>

      {error && (
        <p role="alert" className="text-sm text-error-300">
          {ERROR_COPY[error]}
        </p>
      )}

      <div className="grid max-w-[390px] grid-cols-2 gap-6">
        <Button type="button" variant="outline" size="xl" onClick={onBack}>
          Back
        </Button>
        <Button type="button" size="xl" disabled={pending} onClick={onPay}>
          {pending ? "Paying…" : "Pay"}
        </Button>
      </div>
    </div>
  );
}
