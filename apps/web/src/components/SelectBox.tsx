import { AltArrowDownIcon, CheckCircleIcon } from "@solar-icons/react/outline";
import { Select } from "radix-ui";
import { Icon } from "@solar-icons/react/lib/types";

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectBoxProps {
  options: SelectOption[];
  defaultValue?: string;
  placeholder?: string;
  leftIcon: Icon;
}

export default function SelectBox({
  options,
  defaultValue,
  placeholder = "Select an option",
  leftIcon: LeftIcon,
}: SelectBoxProps) {
  return (
    <Select.Root defaultValue={defaultValue}>
      <Select.Trigger className="flex items-center justify-between gap-3 border border-neutral-800 data-[state=open]:border-primary rounded-lg px-5 py-1 text-base w-64 cursor-pointer">
        <div className="flex items-center gap-2">
          <LeftIcon size={18} />
          <Select.Value placeholder={placeholder} />
        </div>
        <Select.Icon>
          <AltArrowDownIcon size={18} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={4}
          className="min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950 shadow-lg"
        >
          <Select.Viewport className="p-1">
            {options.map(({ value, label, disabled }) => (
              <Select.Item
                key={value}
                value={value}
                disabled={disabled}
                className="relative flex items-center justify-between px-3 py-2 text-sm text-neutral-200 rounded-md cursor-pointer select-none outline-none data-[highlighted]:bg-neutral-800 data-[highlighted]:text-white data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40 data-[state=checked]:font-medium"
              >
                <Select.ItemText>{label}</Select.ItemText>
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
