import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ArrowRightIcon } from "@solar-icons/react/outline";
import React from "react";
import { Button } from "./button";

const meta: Meta<typeof Button> = {
  title: "Components/Button",
  component: Button,
  tags: ["autodocs"],
  args: {
    variant: "primary",
    size: "md",
    disabled: false,
    iconSize: 18,
  },
  argTypes: {
    variant: {
      control: { type: "select" },
      options: ["primary", "outline", "ghost"],
    },
    size: {
      control: { type: "radio" },
      options: ["sm", "md", "lg", "xl", "icon"],
    },
    iconSize: {
      control: { type: "select" },
      options: [16, 18, 24],
    },
    leftIcon: {
      control: { type: "boolean" },
      mapping: { true: ArrowRightIcon, false: undefined },
    },
    rightIcon: {
      control: { type: "boolean" },
      mapping: { true: ArrowRightIcon, false: undefined },
    },
    disabled: {
      control: { type: "boolean" },
    },
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof Button>;

export const Playground: Story = {
  render: (args) => <Button {...args}>Button</Button>,
} satisfies Story;
