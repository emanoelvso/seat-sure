import {
  AltArrowDownIcon,
  CheckCircleIcon,
  MapPointIcon,
} from "@solar-icons/react/outline";
import { Select } from "radix-ui";

interface LocationOption {
  value: string;
  label: string;
}

interface LocationSelectProps {
  options: LocationOption[];
  value: string;
  onChange: (value: string) => void;
}

export function LocationSelect({
  options,
  value,
  onChange,
}: LocationSelectProps) {
  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger
        aria-label="City"
        className="flex cursor-pointer items-center gap-6 outline-none focus-visible:text-tint-400"
      >
        <span className="flex items-center gap-2">
          <MapPointIcon size={24} />
          <span className="text-xl font-bold">
            <Select.Value />
          </span>
        </span>
        <Select.Icon>
          <AltArrowDownIcon size={24} />
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
