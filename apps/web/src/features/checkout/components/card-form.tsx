"use client";

import { CheckCircleIcon, EyeClosedIcon, EyeIcon } from "@solar-icons/react/outline";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardPreview } from "@/features/checkout/components/card-preview";
import {
  formatCardNumber,
  formatExpiryInput,
  validateCard,
  type CardFieldErrors,
  type CardInput,
} from "@/features/checkout/utils/card";

type CardField = keyof CardInput;

interface CardFormProps {
  value: CardInput;
  onChange: (value: CardInput) => void;
  /** Field errors returned by the server (PAY-52). */
  errors?: Partial<CardFieldErrors>;
  onSubmit: () => void;
}

const FORMATTERS: Record<CardField, (raw: string) => string> = {
  number: formatCardNumber,
  holder: (raw) => raw,
  expiry: formatExpiryInput,
  cvv: (raw) => raw.replace(/\D/g, "").slice(0, 4),
};

// PAY-26..32: the controlled card form under a live card preview. A field's
// own error shows once it loses focus with a non-empty value; server errors
// show as given.
export function CardForm({ value, onChange, errors, onSubmit }: CardFormProps) {
  const [blurred, setBlurred] = useState<Partial<Record<CardField, boolean>>>({});
  const [cvvVisible, setCvvVisible] = useState(false);
  const clientErrors = validateCard(value, new Date());
  const isValid = Object.values(clientErrors).every((message) => !message);

  function errorFor(field: CardField) {
    if (blurred[field] && value[field] && clientErrors[field]) {
      return clientErrors[field];
    }
    return errors?.[field] || undefined;
  }

  function fieldProps(field: CardField) {
    const error = errorFor(field);
    return {
      value: value[field],
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
        setBlurred((current) => ({ ...current, [field]: false }));
        onChange({ ...value, [field]: FORMATTERS[field](event.target.value) });
      },
      onBlur: () => setBlurred((current) => ({ ...current, [field]: true })),
      variant: error ? ("error" as const) : undefined,
      supportingText: error,
    };
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isValid) onSubmit();
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
      <CardPreview number={value.number} holder={value.holder} expiry={value.expiry} />
      <h2 className="text-xl font-bold text-white">Payment details</h2>
      <div className="flex flex-col gap-2">
        <Input
          label="Card number"
          size="md"
          inputMode="numeric"
          autoComplete="cc-number"
          rightAdornment={
            !clientErrors.number && (
              <span role="img" aria-label="Valid card number" className="text-success-300">
                <CheckCircleIcon size={20} />
              </span>
            )
          }
          {...fieldProps("number")}
        />
        <Input label="Card holder" size="md" autoComplete="cc-name" {...fieldProps("holder")} />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="MM/YY"
            size="md"
            inputMode="numeric"
            autoComplete="cc-exp"
            {...fieldProps("expiry")}
          />
          <Input
            label="CVV"
            size="md"
            inputMode="numeric"
            autoComplete="cc-csc"
            type={cvvVisible ? "text" : "password"}
            rightIcon={cvvVisible ? EyeClosedIcon : EyeIcon}
            rightIconLabel={cvvVisible ? "Hide CVV" : "Show CVV"}
            onRightIconClick={() => setCvvVisible((current) => !current)}
            {...fieldProps("cvv")}
          />
        </div>
      </div>
      <Button type="submit" size="xl" disabled={!isValid}>
        Review order
      </Button>
    </form>
  );
}
