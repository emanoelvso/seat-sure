import { cva, VariantProps } from "class-variance-authority";
import { ReactNode } from "react";

const tagPillVariant = cva("inline-flex items-center  rounded-xl", {
  variants: {
    variant: {
      pending: "bg-warning-200/8 text-warning-200",
      success: "bg-success-200/8 text-success-300",
      info: "bg-info-200/8 text-info-300",
      // SPEC_DEVIATION: Figma's "Tag card" fail state uses error-300
      // (#F44336), 4.3:1 on its own tint, below WCAG AA.
      // Reason: error-200 passes the a11y check at the same hue.
      error: "bg-error-200/8 text-error-200",
    },
    size: {
      xs: "py-1 px-3 text-xs",
      sm: "py-1.5 px-4 text-sm",
    },
  },
  defaultVariants: { variant: "pending", size: "sm" },
});

interface TagPillProps extends VariantProps<typeof tagPillVariant> {
  children: ReactNode;
}

export function TagPill({ children, variant, size }: TagPillProps) {
  return (
    <span className={tagPillVariant({ variant, size })}>
      <span>{children}</span>
    </span>
  );
}
