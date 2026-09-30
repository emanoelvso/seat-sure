import { AltArrowDownIcon, CheckCircleIcon } from "@solar-icons/react/outline";
import { Select } from "radix-ui";
import { Icon } from "@solar-icons/react/lib/types";
import { createElement } from "react";

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectBoxProps {
  options: SelectOption[];
  defaultValue?: string;
  placeholder?: string;
  label?: string;
  leftIcon?: Icon;
  supportingText?: string;
  counter?: string;
  freeText?: boolean;
  value?: string;
  onChange?: (value?: string | undefined) => void;
}

export function SelectBox({
  options,
  defaultValue,
  placeholder,
  label,
  leftIcon,
  freeText,
  value,
  onChange,
}: SelectBoxProps) {
  return (
    <div className="w-full max-w-xl flex flex-col gap-1">
      <fieldset className="relative w-full bg-neutral-700 border rounded-lg border-neutral-800">
        {label && (
          <legend className="ml-3 px-1 text-xs text-neutral-200 leading-none">
            {label}
          </legend>
        )}
        {freeText ? (
          <div className="relative flex items-center">
            {leftIcon &&
              createElement(leftIcon, {
                className:
                  "absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-300",
                size: 18,
              })}
            <input
              type="text"
              value={value}
              onChange={(e) => onChange?.(e.target.value)}
              placeholder={placeholder}
              className={`w-full bg-transparent outline-none text-white placeholder:text-neutral-400 text-sm ${leftIcon ? "pl-12" : "pl-4"} pr-4 py-2`}
            />
          </div>
        ) : (
          <Select.Root
            value={value ?? ""}
            onValueChange={onChange}
            defaultValue={defaultValue}
          >
            <Select.Trigger
              className={`flex items-center justify-between gap-3 w-full bg-transparent outline-none text-white placeholder:text-neutral-300 text-sm ${leftIcon ? "pl-12" : "pl-4"} pr-4 py-2 cursor-pointer data-[state=open]:border-primary`}
            >
              {leftIcon &&
                createElement(leftIcon, {
                  className:
                    "absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-300",
                  size: 18,
                })}
              <Select.Value placeholder={placeholder} />
              <Select.Icon>
                <AltArrowDownIcon size={18} className="text-neutral-300" />
              </Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content
                position="popper"
                sideOffset={4}
                className="min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950 shadow-lg"
              >
                <Select.Viewport className="p-1">
                  {options?.map(({ value, label, disabled }) => (
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
        )}
      </fieldset>
    </div>
  );
}
