import { cva, VariantProps } from "class-variance-authority";
import { ReactNode } from "react";

const subCategoriePillVariant = cva(
  "inline-flex items-center cursor-pointer py-2 px-4 rounded-2xl text-xs border transition-colors",
  {
    variants: {
      variant: {
        default: "bg-neutral-600 border-neutral-500 text-neutral-100 hover:bg-neutral-500 hover:border-neutral-400 active:bg-neutral-700 active:border-neutral-600",
        active: "border-tint-600 text-tint-400 hover:border-tint-400 hover:text-tint-300 active:border-tint-600 active:text-tint-600 [background:linear-gradient(180deg,rgba(193,79,230,0.40)_0%,rgba(27,27,27,0)_100%)]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

interface SubCategoriePillProps extends VariantProps<
  typeof subCategoriePillVariant
> {
  children: ReactNode;
}

export default function SubCategoriePill({
  children,
  variant,
}: SubCategoriePillProps) {
  return (
    <button type="button" className={subCategoriePillVariant({ variant })}>
      <span>{children}</span>
    </button>
  );
}
