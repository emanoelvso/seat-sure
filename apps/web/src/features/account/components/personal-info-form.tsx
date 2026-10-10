"use client";

import {
  GlobalIcon,
  HashtagIcon,
  LetterIcon,
  MapPointIcon,
  UserIcon,
} from "@solar-icons/react/outline";
import { startTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BirthDatePicker } from "@/features/account/components/birth-date-picker";
import { PhoneCodeSelect } from "@/features/account/components/phone-code-select";
import type {
  PersonalInfoFormState,
  PersonalInfoValues,
} from "@/features/account/utils/personal-info-schema";

// Figma "Main Input" size 56: 18px text, 16px vertical padding. The `!`
// beats the Input's own text-sm / py-2.
const FIELD_CLASS = "py-4! text-lg!";

interface PersonalInfoFormProps {
  email: string;
  // The last saved values: Discard restores them and Discard is disabled
  // while the form equals them.
  saved: PersonalInfoValues;
  state: PersonalInfoFormState;
  pending: boolean;
  onSave: (values: PersonalInfoValues) => void;
  // 'YYYY-MM-DD'; passed to the date picker so stories can fix the clock.
  today?: string;
}

function isSame(a: PersonalInfoValues, b: PersonalInfoValues): boolean {
  return (Object.keys(a) as (keyof PersonalInfoValues)[]).every(
    (key) => a[key] === b[key],
  );
}

// Personal info form (PROFILE-01 AC 3-4, PROFILE-04, PROFILE-05), from Figma
// 5011:120578: two columns with a 32px gap, 48px between rows, Discard and
// Save changes (154x48) at the right. Values are controlled so Discard can
// reset them and the dirty check can run.
export function PersonalInfoForm({
  email,
  saved,
  state,
  pending,
  onSave,
  today,
}: PersonalInfoFormProps) {
  const [values, setValues] = useState(saved);
  const [lastSaved, setLastSaved] = useState(saved);

  // A new `saved` (after a successful save) becomes the form's values. Done
  // while rendering so there is no frame with stale values.
  if (saved !== lastSaved) {
    setLastSaved(saved);
    setValues(saved);
  }

  const dirty = !isSame(values, saved);
  const errors = state.fieldErrors;

  function field<K extends keyof PersonalInfoValues>(key: K) {
    return {
      value: values[key],
      onChange: (event: { target: { value: string } }) =>
        setValues((current) => ({ ...current, [key]: event.target.value })),
    };
  }

  function errorProps(key: string) {
    return errors[key]
      ? { variant: "error" as const, supportingText: errors[key] }
      : {};
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-8"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(() => onSave(values));
      }}
    >
      <div className="grid grid-cols-2 gap-x-8 gap-y-11">
        <Input
          label="First Name"
          leftIcon={UserIcon}
          autoComplete="given-name"
          className={FIELD_CLASS}
          {...field("firstName")}
          {...errorProps("firstName")}
        />
        <Input
          label="Last Name"
          leftIcon={UserIcon}
          autoComplete="family-name"
          className={FIELD_CLASS}
          {...field("lastName")}
          {...errorProps("lastName")}
        />
        <Input
          label="Email"
          leftIcon={LetterIcon}
          variant="disabled"
          disabled
          value={email}
          readOnly
          className={FIELD_CLASS}
        />
        <Input
          label="State"
          leftIcon={GlobalIcon}
          autoComplete="address-level1"
          className={FIELD_CLASS}
          {...field("state")}
          {...errorProps("state")}
        />
        <Input
          label="City"
          leftIcon={MapPointIcon}
          autoComplete="address-level2"
          className={FIELD_CLASS}
          {...field("city")}
          {...errorProps("city")}
        />
        <BirthDatePicker
          value={values.birthDate}
          today={today}
          error={errors.birthDate}
          onChange={(birthDate) =>
            setValues((current) => ({ ...current, birthDate }))
          }
        />
        <div className="flex items-start gap-2.5">
          <PhoneCodeSelect
            value={values.phoneCountryCode}
            invalid={Boolean(errors.phone)}
            onChange={(phoneCountryCode) =>
              setValues((current) => ({ ...current, phoneCountryCode }))
            }
          />
          <Input
            aria-label="Phone number"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            className={FIELD_CLASS}
            {...field("phoneNumber")}
            {...errorProps("phone")}
          />
        </div>
        <Input
          label="Zip code"
          leftIcon={HashtagIcon}
          autoComplete="postal-code"
          className={FIELD_CLASS}
          {...field("zipCode")}
          {...errorProps("zipCode")}
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="text-sm">
          {state.status === "saved" && (
            <p role="status" className="text-success-200">
              Your changes have been saved.
            </p>
          )}
          {state.formError && (
            <p role="alert" className="text-error-200">
              {state.formError}
            </p>
          )}
        </div>
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            size="xl"
            disabled={!dirty}
            onClick={() => setValues(saved)}
            className="h-12 w-[154px] px-4 py-[9px] disabled:border-neutral-300! disabled:text-neutral-300!"
          >
            Discard
          </Button>
          {/* Figma fills Save with primary; white on it is 3.79:1, so tint-600
              (a11y gate 4.5:1). */}
          <Button
            type="submit"
            size="xl"
            disabled={pending}
            className="h-12 w-[154px] border border-tint-600 bg-tint-600! px-4 py-[9px] hover:bg-primary!"
          >
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </form>
  );
}
