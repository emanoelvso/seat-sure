import { Icon } from "@solar-icons/react/lib/types";
import { cva, VariantProps } from "class-variance-authority";
import { createElement } from "react";

const fieldsetVariants = cva(
  "relative w-full bg-neutral-700 border rounded-lg",
  {
    variants: {
      variant: {
        default: "border-neutral-800",
        success: "border-success-400",
        error: "border-error-400",
        disabled: "border-neutral-800/50",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

const supportingTextVariants = cva("flex justify-between text-xs", {
  variants: {
    variant: {
      default: "text-neutral-400",
      success: "text-success-400",
      error: "text-error-400",
      disabled: "text-neutral-400",
    },
  },
  defaultVariants: { variant: "default" },
});

const inputVariants = cva(
  "w-full bg-transparent outline-none text-white placeholder:text-neutral-300",
  {
    variants: {
      size: {
        sm: "text-sm",
        md: "text-md",
      },
    },
    defaultVariants: { size: "sm" },
  },
);

interface InputProps
  extends
    VariantProps<typeof fieldsetVariants>,
    VariantProps<typeof inputVariants> {
  label?: string;
  leftIcon?: Icon;
  rightIcon?: Icon;
  supportingText?: string;
  counter?: string;
  placeholder?: string;
}

export default function Input({
  variant,
  size,
  label,
  leftIcon,
  rightIcon,
  supportingText,
  counter,
  placeholder,
}: InputProps) {
  return (
    <div className="w-full max-w-xl flex flex-col gap-1">
      <fieldset className={fieldsetVariants({ variant })}>
        {label && (
          <legend className="ml-3 px-1 text-xs text-neutral-200 leading-none">
            {label}
          </legend>
        )}
        {leftIcon &&
          createElement(leftIcon, {
            className:
              "absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-300",
            size: 18,
          })}
        <input
          type="text"
          placeholder={placeholder}
          className={`${inputVariants({ size })} ${leftIcon ? "pl-12" : "pl-4"} ${rightIcon ? "pr-12" : "pr-4"} py-2`}
        />
        {rightIcon && (
          <button
            type="button"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-300 hover:text-white"
          >
            {createElement(rightIcon, { size: 18 })}
          </button>
        )}
      </fieldset>
      <div className={supportingTextVariants({ variant })}>
        <span>{supportingText}</span>
        <span>{counter}</span>
      </div>
    </div>
  );
}
