import { AltArrowDownIcon, CheckCircleIcon } from "@solar-icons/react/outline";
import { Select } from "radix-ui";
import { subCategoriePillVariant } from "@/components/SubCategoriePill";

interface PillSelectOption {
  value: string;
  label: string;
}

interface PillSelectProps {
  label: string;
  value: string;
  options: PillSelectOption[];
  onChange: (value: string) => void;
  variant?: "default" | "active";
}

export default function PillSelect({
  label,
  value,
  options,
  onChange,
  variant = "default",
}: PillSelectProps) {
  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger
        aria-label={label}
        className={`${subCategoriePillVariant({ variant, size: "sm" })} outline-none focus-visible:ring-2 focus-visible:ring-tint-400`}
      >
        <Select.Value />
        <Select.Icon className="flex">
          <AltArrowDownIcon size={16} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          align="start"
          sideOffset={8}
          className="z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-neutral-500 bg-neutral-1000 shadow-lg"
        >
          <Select.Viewport className="p-1">
            {options.map((option) => (
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
  );
}
