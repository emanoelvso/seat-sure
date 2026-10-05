import { Button } from "@/components/ui/button";

interface TicketsStepProps {
  quantity: number;
  onConfirm?: () => void;
  confirmDisabled?: boolean;
}

// PAY-04, PAY-18: the Tickets step. The quantity is fixed by the picked
// seats, so it is shown read-only instead of in a select.
export function TicketsStep({
  quantity,
  onConfirm,
  confirmDisabled,
}: TicketsStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-white">
        Make sure the number of tickets is correct before proceeding.
      </p>
      <dl className="flex items-center justify-between gap-4 text-neutral-100">
        <dt>Ticket quantity</dt>
        <dd className="flex h-12 min-w-20 items-center justify-center rounded-lg border border-neutral-400 px-4 text-lg text-white">
          {quantity}
        </dd>
      </dl>
      <Button
        type="button"
        size="xl"
        disabled={confirmDisabled}
        onClick={onConfirm}
      >
        Confirm
      </Button>
    </div>
  );
}
