import { cva, VariantProps } from "class-variance-authority";
import { ReactNode } from "react";

const statusPillVariant = cva("inline-flex items-center  rounded-xl", {
  variants: {
    variant: {
      pending: "bg-[#FFBE5D]/8 text-warning-200",
      success: "bg-[#6BBE6E]/8 text-success-300",
      info: "bg-[#49A8F5]/8 text-info-300",
      error: "bg-[#F66359]/8 text-error-300",
    },
    size: {
      xs: "py-1 px-3 text-xs",
      sm: "py-1.5 px-4 text-sm",
    },
  },
  defaultVariants: { variant: "pending", size: "sm" },
});

interface StatusPillProps extends VariantProps<typeof statusPillVariant> {
  children: ReactNode;
}

export default function StatusPill({
  children,
  variant,
  size,
}: StatusPillProps) {
  return (
    <button type="button" className={statusPillVariant({ variant, size })}>
      <span>{children}</span>
    </button>
  );
}
