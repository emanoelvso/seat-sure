import { AltArrowDownIcon, CheckCircleIcon } from "@solar-icons/react/outline";
import { Select } from "radix-ui";

export type SortOrder = "desc" | "asc";

const OPTIONS: { value: SortOrder; label: string }[] = [
  { value: "desc", label: "Price: high to low" },
  { value: "asc", label: "Price: low to high" },
];

interface SortSelectProps {
  value: SortOrder;
  onChange: (value: SortOrder) => void;
}

export function SortSelect({ value, onChange }: SortSelectProps) {
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden="true" className="text-neutral-100">
        Sort by
      </span>
      <Select.Root
        value={value}
        onValueChange={(next) => onChange(next as SortOrder)}
      >
        <Select.Trigger
          aria-label="Sort by"
          className="flex cursor-pointer items-center gap-1 text-white outline-none focus-visible:text-tint-400"
        >
          <Select.Value />
          <Select.Icon className="flex">
            <AltArrowDownIcon size={16} />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content
            position="popper"
            align="end"
            sideOffset={8}
            className="z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-neutral-500 bg-neutral-1000 shadow-lg"
          >
            <Select.Viewport className="p-1">
              {OPTIONS.map((option) => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  className="relative flex cursor-pointer select-none items-center justify-between gap-3 rounded-md px-3 py-2 text-sm text-neutral-200 outline-none data-[highlighted]:bg-neutral-700 data-[highlighted]:text-white data-[state=checked]:font-medium"
                >
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator>
                    <CheckCircleIcon size={16} />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}
