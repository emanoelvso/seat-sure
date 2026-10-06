import { TagPill } from "@/components/ui/tag-pill";
import type { AccountOrderStatus } from "@/types/__generated__/schema";

// Completed green, Pending yellow, Canceled red (spec "Badge colors").
const BADGES = {
  COMPLETED: { label: "Completed", variant: "success" },
  PENDING: { label: "Pending", variant: "pending" },
  CANCELLED: { label: "Canceled", variant: "error" },
} as const;

// Figma's "Tag card" size=32 has 12px text in 8/16 padding; TagPill "xs"
// keeps the 12px text with the shared pill's 4/12 padding.
export function OrderStatusBadge({ status }: { status: AccountOrderStatus }) {
  const { label, variant } = BADGES[status];
  return (
    <TagPill variant={variant} size="xs">
      {label}
    </TagPill>
  );
}
