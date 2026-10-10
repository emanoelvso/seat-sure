import { Icon } from "@solar-icons/react/lib/types";
import { cva, VariantProps } from "class-variance-authority";
import {
  createElement,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

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
      default: "text-neutral-200",
      success: "text-success-400",
      error: "text-error-400",
      disabled: "text-neutral-200",
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
    VariantProps<typeof inputVariants>,
    Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  leftIcon?: Icon;
  rightIcon?: Icon;
  rightIconLabel?: string;
  onRightIconClick?: () => void;
  /** Non-interactive content shown at the right, e.g. a labelled status icon. Not focusable, not a button. */
  rightAdornment?: ReactNode;
  supportingText?: string;
  counter?: string;
}

export function Input({
  variant,
  size,
  label,
  leftIcon,
  rightIcon,
  rightIconLabel,
  onRightIconClick,
  rightAdornment,
  supportingText,
  counter,
  id,
  type = "text",
  className,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const labelId = `${inputId}-label`;
  const supportingTextId = `${inputId}-supporting-text`;
  const isError = variant === "error";

  return (
    <div className="w-full max-w-xl flex flex-col gap-1">
      <fieldset className={fieldsetVariants({ variant })}>
        {label && (
          <legend
            id={labelId}
            className="ml-3 px-1 text-xs text-neutral-200 leading-none"
          >
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
          id={inputId}
          type={type}
          aria-labelledby={label ? labelId : undefined}
          aria-invalid={isError || undefined}
          aria-describedby={supportingText ? supportingTextId : undefined}
          className={`${inputVariants({ size })} ${leftIcon ? "pl-12" : "pl-4"} ${rightIcon || rightAdornment ? "pr-12" : "pr-4"} py-2 ${className ?? ""}`}
          {...props}
        />
        {rightIcon && (
          <button
            type="button"
            aria-label={rightIconLabel}
            onClick={onRightIconClick}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-300 hover:text-white"
          >
            {createElement(rightIcon, { size: 18 })}
          </button>
        )}
        {!rightIcon && rightAdornment && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-300">
            {rightAdornment}
          </span>
        )}
      </fieldset>
      <div className={supportingTextVariants({ variant })}>
        <span id={supportingTextId}>{supportingText}</span>
        <span>{counter}</span>
      </div>
    </div>
  );
}
