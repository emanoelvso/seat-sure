"use client";

import {
  CardCvcElement,
  CardExpiryElement,
  CardNumberElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type StripeField = "number" | "expiry" | "cvc";
type Field = StripeField | "holder";

interface StripeCardFieldsProps {
  // Called with the PaymentMethod id once Stripe tokenized the card. The card
  // number, expiry and CVC never leave Stripe's iframes (GW-41).
  onPaymentMethod: (paymentMethodId: string) => void;
  submitLabel: string;
  pendingLabel?: string;
  // True while the parent works on the id (it blocks a second submit)
  pending?: boolean;
  // Rendered under the fields, above the button
  footer?: ReactNode;
  // An error that belongs to the whole form (e.g. a server failure)
  formError?: string;
  holderLabel?: string;
  className?: string;
}

const INCOMPLETE: Record<StripeField, string> = {
  number: "Your card number is incomplete.",
  expiry: "Your card's expiration date is incomplete.",
  cvc: "Your card's security code is incomplete.",
};
const HOLDER_ERROR = "Enter the name on the card";
const GENERIC_ERROR = "Something went wrong. Please try again.";
const NOT_READY_ERROR = "Payments are still loading. Try again in a moment.";

// Stripe error codes from createPaymentMethod, by the field they belong to
const FIELD_BY_CODE: Record<string, StripeField> = {
  incomplete_number: "number",
  invalid_number: "number",
  incorrect_number: "number",
  incomplete_expiry: "expiry",
  invalid_expiry_month: "expiry",
  invalid_expiry_year: "expiry",
  invalid_expiry_year_past: "expiry",
  incomplete_cvc: "cvc",
  invalid_cvc: "cvc",
  incorrect_cvc: "cvc",
};

// Elements re-mount when their options change, so these stay module-level.
const ELEMENT_OPTIONS = {
  style: {
    base: {
      color: "#ffffff",
      fontSize: "18px",
      "::placeholder": { color: "#a3a3a3" },
    },
    invalid: { color: "#f87171" },
  },
};
const NUMBER_OPTIONS = { ...ELEMENT_OPTIONS, showIcon: true };

type ChangeEvent = { complete: boolean; error?: { message: string } };

// GW-41, GW-44: the card number, expiry and CVC as Stripe Elements plus the
// holder name. An incomplete or invalid field shows Stripe's message under it
// and stops the submit before anything is created.
export function StripeCardFields({
  onPaymentMethod,
  submitLabel,
  pendingLabel,
  pending = false,
  footer,
  formError,
  holderLabel = "Card holder",
  className,
}: StripeCardFieldsProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [holder, setHolder] = useState("");
  const [complete, setComplete] = useState<Record<StripeField, boolean>>({
    number: false,
    expiry: false,
    cvc: false,
  });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [localFormError, setLocalFormError] = useState<string>();
  const [creating, setCreating] = useState(false);
  const busy = creating || pending;

  function setFieldError(field: Field, message: string | undefined) {
    setErrors((current) => ({ ...current, [field]: message }));
  }

  function handleChange(field: StripeField) {
    return (event: ChangeEvent) => {
      setComplete((current) => ({ ...current, [field]: event.complete }));
      setFieldError(field, event.error?.message);
      setLocalFormError(undefined);
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    // GW-44: nothing is created while a field is empty, incomplete or invalid
    const next: Partial<Record<Field, string>> = {};
    if (!holder.trim()) next.holder = HOLDER_ERROR;
    for (const field of ["number", "expiry", "cvc"] as const) {
      if (!complete[field]) next[field] = errors[field] ?? INCOMPLETE[field];
    }
    if (Object.keys(next).length > 0) {
      setErrors((current) => ({ ...current, ...next }));
      return;
    }

    const cardNumber = elements?.getElement(CardNumberElement);
    if (!stripe || !cardNumber) {
      setLocalFormError(NOT_READY_ERROR);
      return;
    }

    setCreating(true);
    setLocalFormError(undefined);
    try {
      const result = await stripe.createPaymentMethod({
        type: "card",
        card: cardNumber,
        billing_details: { name: holder.trim() },
      });
      if (result.error) {
        const field = result.error.code
          ? FIELD_BY_CODE[result.error.code]
          : undefined;
        if (field && result.error.message) {
          setFieldError(field, result.error.message);
        } else {
          setLocalFormError(result.error.message ?? GENERIC_ERROR);
        }
        return;
      }
      onPaymentMethod(result.paymentMethod.id);
    } catch {
      setLocalFormError(GENERIC_ERROR);
    } finally {
      setCreating(false);
    }
  }

  const shownFormError = formError ?? localFormError;

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className={`flex flex-col gap-6 ${className ?? ""}`}
    >
      <div className="flex flex-col gap-2">
        <ElementField label="Card number" error={errors.number}>
          <CardNumberElement
            options={NUMBER_OPTIONS}
            onChange={handleChange("number")}
          />
        </ElementField>
        <Input
          label={holderLabel}
          size="md"
          autoComplete="cc-name"
          value={holder}
          onChange={(event) => {
            setHolder(event.target.value);
            setFieldError("holder", undefined);
          }}
          variant={errors.holder ? "error" : undefined}
          supportingText={errors.holder}
        />
        <div className="grid grid-cols-2 gap-3">
          <ElementField label="MM/YY" error={errors.expiry}>
            <CardExpiryElement
              options={ELEMENT_OPTIONS}
              onChange={handleChange("expiry")}
            />
          </ElementField>
          <ElementField label="CVC" error={errors.cvc}>
            <CardCvcElement
              options={ELEMENT_OPTIONS}
              onChange={handleChange("cvc")}
            />
          </ElementField>
        </div>
      </div>
      {shownFormError && (
        <p role="alert" className="text-sm text-error-300">
          {shownFormError}
        </p>
      )}
      {footer}
      <Button type="submit" size="xl" disabled={busy}>
        {busy && pendingLabel ? pendingLabel : submitLabel}
      </Button>
    </form>
  );
}

// The same box and legend as the other inputs around an Element's iframe
function ElementField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex w-full max-w-xl flex-col gap-1">
      <fieldset
        className={`rounded-lg border bg-neutral-700 ${error ? "border-error-400" : "border-neutral-800"}`}
      >
        <legend
          id={`${id}-label`}
          className="ml-3 px-1 text-xs leading-none text-neutral-200"
        >
          {label}
        </legend>
        <div
          role="group"
          aria-labelledby={`${id}-label`}
          aria-describedby={error ? `${id}-error` : undefined}
          className="px-4 py-4"
        >
          {children}
        </div>
      </fieldset>
      <div className="text-xs text-error-400">
        <span id={`${id}-error`}>{error}</span>
      </div>
    </div>
  );
}
