"use client";

import { useState } from "react";
import { EyeClosedIcon, EyeIcon, LockIcon } from "@solar-icons/react/outline";
import { Input } from "@/components/ui/input";

interface PasswordFieldProps {
  label: string;
  name?: string;
  variant?: "default" | "success" | "error" | "disabled";
  supportingText?: string;
  // Opt-in controlled/uncontrolled passthrough: lets a controlled caller
  // (e.g. ResetPasswordForm, AUTH-69) keep a typed value across a form
  // reset that would otherwise clear an uncontrolled input.
  value?: string;
  defaultValue?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

// AUTH-30: a password input with a lock icon and an eye toggle that swaps
// between masked and plain text, announcing the action it performs next.
export function PasswordField({
  label,
  name,
  variant,
  supportingText,
  value,
  defaultValue,
  onChange,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <Input
      label={label}
      name={name}
      type={visible ? "text" : "password"}
      variant={variant}
      supportingText={supportingText}
      value={value}
      defaultValue={defaultValue}
      onChange={onChange}
      leftIcon={LockIcon}
      rightIcon={visible ? EyeClosedIcon : EyeIcon}
      rightIconLabel={visible ? "Hide password" : "Show password"}
      onRightIconClick={() => setVisible((current) => !current)}
    />
  );
}
