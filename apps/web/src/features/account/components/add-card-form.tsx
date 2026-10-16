"use client";

import {
  CheckCircleIcon,
  EyeClosedIcon,
  EyeIcon,
} from "@solar-icons/react/outline";
import {
  startTransition,
  useActionState,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type FormEvent,
  type Ref,
} from "react";
import { DemoPaymentNotice } from "@/components/demo-payment-notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PaymentCard } from "@/features/account/api/find-my-payment-cards";
import type { AddPaymentCardState } from "@/features/account/api/add-payment-card-action";
import {
  formatCardNumber,
  formatExpiryInput,
  validateCard,
  type CardInput,
} from "@/utils/card";

type CardField = keyof CardInput;
type AddCardAction = (
  state: AddPaymentCardState,
  card: CardInput,
) => Promise<AddPaymentCardState>;

export interface AddCardFormHandle {
  /** Clears the form and focuses "Name on card" (CARD-03 AC 15). */
  reset: () => void;
}

interface AddCardFormProps {
  action: AddCardAction;
  /** True while the user has no saved card (CARD-03 AC 6). */
  isFirstCard: boolean;
  onSaved: (cards: PaymentCard[]) => void;
  ref?: Ref<AddCardFormHandle>;
}

const EMPTY: CardInput = { holder: "", number: "", expiry: "", cvv: "" };
const INITIAL_STATE: AddPaymentCardState = { status: "idle", fieldErrors: {} };
const FORMATTERS: Record<CardField, (raw: string) => string> = {
  number: formatCardNumber,
  holder: (raw) => raw,
  expiry: formatExpiryInput,
  cvv: (raw) => raw.replace(/\D/g, "").slice(0, 4),
};
// Figma "Main Input" size 56: 18px text, 16px vertical padding. The `!`
// beats the Input's own text-sm / py-2.
const FIELD_CLASS = "py-4! text-lg!";

// Add-card form (CARD-03..05), from Figma 5011:121848 (helper text) and
// 5011:121849: 24px between rows, Expiry and CVC/CVV side by side with a
// 16px gap. The values live in this component and are only sent to the
// injected action; nothing is kept once the card is saved.
export function AddCardForm({
  action,
  isFirstCard,
  onSaved,
  ref,
}: AddCardFormProps) {
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);
  const [values, setValues] = useState<CardInput>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<CardField, boolean>>>(
    {},
  );
  // Server errors belong to the values that produced them: editing a field
  // (or resetting) hides that field's server error until the next result.
  const [edited, setEdited] = useState<Partial<Record<CardField, boolean>>>({});
  const [hiddenState, setHiddenState] = useState<AddPaymentCardState | null>(
    null,
  );
  const [cvvVisible, setCvvVisible] = useState(false);
  const [lastState, setLastState] = useState(state);
  const formRef = useRef<HTMLFormElement>(null);

  // Done while rendering so there is no frame with stale values or errors.
  if (state !== lastState) {
    setLastState(state);
    setEdited({});
    if (state.status === "saved") {
      setValues(EMPTY);
      setTouched({});
      setCvvVisible(false);
    }
  }

  useEffect(() => {
    if (state.status === "saved") onSaved(state.cards);
    // onSaved is a parent callback; only a new result should fire it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  useImperativeHandle(ref, () => ({
    reset() {
      setValues(EMPTY);
      setTouched({});
      setEdited({});
      setCvvVisible(false);
      setHiddenState(state);
      formRef.current
        ?.querySelector<HTMLInputElement>('input[name="holder"]')
        ?.focus();
    },
  }));

  const clientErrors = validateCard(values, new Date());
  const visibleState = state === hiddenState ? INITIAL_STATE : state;
  const serverErrors =
    visibleState.status === "saved" ? {} : visibleState.fieldErrors;
  const formError =
    visibleState.status === "error" ? visibleState.formError : undefined;

  function errorFor(field: CardField) {
    if (touched[field] && clientErrors[field]) return clientErrors[field];
    if (!edited[field] && serverErrors[field]) return serverErrors[field];
    return undefined;
  }

  function fieldProps(field: CardField) {
    const error = errorFor(field);
    return {
      name: field,
      value: values[field],
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
        setEdited((current) => ({ ...current, [field]: true }));
        setValues((current) => ({
          ...current,
          [field]: FORMATTERS[field](event.target.value),
        }));
      },
      onBlur: () =>
        setTouched((current) => ({ ...current, [field]: !!values[field] })),
      variant: error ? ("error" as const) : undefined,
      supportingText: error,
      size: "md" as const,
      className: FIELD_CLASS,
    };
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const broken = Object.values(clientErrors).some(Boolean);
    if (broken) {
      // CARD-04 AC 7: reject the save and show every rule's message.
      setTouched({ holder: true, number: true, expiry: true, cvv: true });
      return;
    }
    setHiddenState(null);
    startTransition(() => formAction(values));
  }

  return (
    <div className="flex flex-col gap-12">
      <DemoPaymentNotice />
      {isFirstCard && (
        <p className="text-base text-neutral-100">
          This credit card will be used by default for billing.
        </p>
      )}
      <form
        ref={formRef}
        noValidate
        onSubmit={handleSubmit}
        className="flex flex-col gap-6"
      >
        <div className="flex flex-col gap-6">
          <Input
            label="Name on card"
            autoComplete="cc-name"
            {...fieldProps("holder")}
          />
          <Input
            label="Card number"
            inputMode="numeric"
            autoComplete="cc-number"
            rightAdornment={
              !clientErrors.number && (
                <span
                  role="img"
                  aria-label="Valid card number"
                  className="text-success-300"
                >
                  <CheckCircleIcon size={20} />
                </span>
              )
            }
            {...fieldProps("number")}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Expiry"
            inputMode="numeric"
            autoComplete="cc-exp"
            {...fieldProps("expiry")}
          />
          <Input
            label="CVC/CVV"
            inputMode="numeric"
            autoComplete="cc-csc"
            type={cvvVisible ? "text" : "password"}
            rightIcon={cvvVisible ? EyeClosedIcon : EyeIcon}
            rightIconLabel={cvvVisible ? "Hide CVV" : "Show CVV"}
            onRightIconClick={() => setCvvVisible((current) => !current)}
            {...fieldProps("cvv")}
          />
        </div>
        {formError && (
          <p role="alert" className="text-sm text-error-300">
            {formError}
          </p>
        )}
        {/* SPEC_DEVIATION: white on primary #C14FE6 is 3.8:1, below WCAG AA
            for 16px text. Reason: tint-600 gives 5.4:1 (as PaymentEmptyState). */}
        <Button
          type="submit"
          size="lg"
          className="self-start bg-tint-600! hover:bg-shade-100! active:bg-shade-100!"
          disabled={pending}
        >
          {pending ? "Saving…" : "Save card"}
        </Button>
      </form>
    </div>
  );
}
