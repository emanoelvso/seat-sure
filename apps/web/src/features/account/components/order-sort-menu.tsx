"use client";

import { SortVerticalIcon } from "@solar-icons/react/outline";
import { useQueryStates } from "nuqs";
import { Select } from "radix-ui";
import {
  accountOrdersParsers,
  type OrderSort,
} from "@/features/account/utils/account-orders-search-params";

const OPTIONS: { value: OrderSort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "highest", label: "Highest amount" },
  { value: "lowest", label: "Lowest amount" },
];

// "Sort by" menu (ORDLIST-04), from Figma 5011:121188 (trigger) and "Sort
// menu" 3658:58121. A pick writes `sort` and drops `page`; the server page
// re-renders with the new order (shallow: false).
export function OrderSortMenu() {
  const [{ sort }, setParams] = useQueryStates(accountOrdersParsers, {
    shallow: false,
    history: "replace",
  });

  return (
    <Select.Root
      value={sort}
      onValueChange={(next) =>
        setParams({ sort: next as OrderSort, page: null })
      }
    >
      <Select.Trigger
        aria-label="Sort by"
        className="flex cursor-pointer items-center gap-2 text-base leading-[120%] font-medium text-neutral-200 outline-none hover:text-white focus-visible:text-white"
      >
        Sort by
        <Select.Icon className="flex">
          <SortVerticalIcon size={24} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          align="end"
          sideOffset={8}
          className="z-50 w-[206px] rounded-2xl bg-neutral-800 p-4"
        >
          <Select.Viewport className="flex flex-col gap-4">
            {OPTIONS.map((option) => (
              <Select.Item
                key={option.value}
                value={option.value}
                className="flex h-8 cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-base text-white outline-none select-none data-[highlighted]:bg-neutral-700 data-[state=checked]:text-tint-400"
              >
                <Select.ItemText>{option.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
