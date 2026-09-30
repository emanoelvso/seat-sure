import { createElement, ReactNode } from "react";
import { Icon } from "@solar-icons/react/lib/types";
import { cva, VariantProps } from "class-variance-authority";

export const buttonVariants = cva(
  "inline-flex items-center cursor-pointer justify-center rounded-lg gap-2 transition-colors focus-visible:outline-none disabled:text-neutral-300 disabled:pointer-events-none text-base leading-[120%]",
  {
    variants: {
      variant: {
        primary:
          "bg-primary hover:bg-tint-400 disabled:bg-neutral-900 text-white active:bg-tint-600",
        outline:
          "border border-primary bg-background text-primary hover:border-tint-400 hover:text-tint-400 active:border-tint-600 active:text-tint-600 disabled:border-neutral-800 disabled:text-neutral-800",
        ghost:
          "bg-background text-primary hover:text-tint-400 active:text-tint-600 disabled:text-neutral-800",
      },
      size: {
        sm: "h-8 px-3",
        md: "h-10 px-4 py-2",
        lg: "h-12 px-8",
        xl: "h-14 px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

interface ButtonProps
  extends VariantProps<typeof buttonVariants>,
    React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
  leftIcon?: Icon;
  rightIcon?: Icon;
  iconSize?: number;
}

export function Button({
  variant,
  size,
  children,
  leftIcon,
  rightIcon,
  iconSize = 18,
  className,
  ...props
}: ButtonProps) {
  return (
    <button className={`${buttonVariants({ variant, size })} ${className ?? ""}`} {...props}>
      {leftIcon && createElement(leftIcon, { size: iconSize })}
      {size !== "icon" && children}
      {rightIcon && createElement(rightIcon, { size: iconSize })}
    </button>
  );
}
