import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AltArrowDownIcon } from "@solar-icons/react/outline";
import { SelectBox } from "./select-box";

const options = [
  { value: "concert", label: "Concert" },
  { value: "sport", label: "Sport" },
  { value: "show", label: "Show" },
  { value: "festival", label: "Festival", disabled: true },
];

const meta: Meta<typeof SelectBox> = {
  // TODO(a11y): button-name still fails axe; tracked in todo.md.
  parameters: { a11y: { test: "todo" } },
  title: "Components/SelectBox",
  component: SelectBox,
  tags: ["autodocs"],
  args: {
    options,
    defaultValue: "sport",
    placeholder: "Select an option",
    leftIcon: AltArrowDownIcon,
  },
  argTypes: {
    leftIcon: {
      table: { disable: true },
    },
  },
} satisfies Meta<typeof SelectBox>;

export default meta;

type Story = StoryObj<typeof SelectBox>;

export const Playground: Story = {} satisfies Story;
