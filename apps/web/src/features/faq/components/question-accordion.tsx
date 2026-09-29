import {
  AltArrowDownIcon,
  QuestionCircleIcon,
} from "@solar-icons/react/outline";
import { Accordion } from "radix-ui";

interface FAQItem {
  value: string;
  question: string;
  answer: string;
}

interface QuestionAccordionProps {
  items: FAQItem[];
}

export function QuestionAccordion({ items }: QuestionAccordionProps) {
  return (
    <Accordion.Root type="single" collapsible className="flex flex-col gap-3">
      {items.map((item) => (
        <Accordion.Item
          key={item.value}
          value={item.value}
          className="rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden"
        >
          <Accordion.Header>
            <Accordion.Trigger className="group flex w-full items-center gap-3 px-5 py-4 text-left text-white cursor-pointer">
              <QuestionCircleIcon />
              <span className="flex-1 text-sm font-medium">
                {item.question}
              </span>
              <AltArrowDownIcon className="shrink-0 text-white transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
            <p className="px-5 pb-4 text-sm text-neutral-200">{item.answer}</p>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
