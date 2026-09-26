import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, waitFor } from "storybook/test";
import ShareButton from "./ShareButton";

const meta: Meta<typeof ShareButton> = {
  title: "Components/ShareButton",
  component: ShareButton,
  args: { title: "Adele - The O2 Arena" },
} satisfies Meta<typeof ShareButton>;

export default meta;

type Story = StoryObj<typeof ShareButton>;

type Spy = ReturnType<typeof fn>;

const stubNavigator = (props: { share?: Spy; writeText?: Spy }) => {
  Object.defineProperty(navigator, "share", {
    value: props.share,
    configurable: true,
  });
  Object.defineProperty(navigator, "clipboard", {
    value: props.writeText ? { writeText: props.writeText } : undefined,
    configurable: true,
  });

  return () => {
    delete (navigator as { share?: unknown }).share;
    delete (navigator as { clipboard?: unknown }).clipboard;
  };
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let share: Spy;
let writeText: Spy;

export const NativeShare: Story = {
  beforeEach: () => {
    share = fn().mockResolvedValue(undefined);
    writeText = fn().mockResolvedValue(undefined);
    return stubNavigator({ share, writeText });
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Share" }));

    await expect(share).toHaveBeenCalledWith({
      title: "Adele - The O2 Arena",
      url: window.location.href,
    });
    await expect(writeText).not.toHaveBeenCalled();
    await expect(canvas.getByRole("status")).toHaveTextContent("");
  },
};

export const CopyFallback: Story = {
  beforeEach: () => {
    writeText = fn().mockResolvedValue(undefined);
    return stubNavigator({ writeText });
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Share" }));

    await expect(writeText).toHaveBeenCalledWith(window.location.href);
    await expect(await canvas.findByText("Link copied")).toBeVisible();

    await wait(1500);
    await expect(canvas.getByRole("status")).toHaveTextContent("Link copied");

    await waitFor(
      () => expect(canvas.getByRole("status")).toHaveTextContent(""),
      { timeout: 1500 },
    );
  },
};

export const CopyFailed: Story = {
  beforeEach: () => {
    writeText = fn().mockRejectedValue(new Error("denied"));
    return stubNavigator({ writeText });
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Share" }));

    await expect(await canvas.findByText("Couldn't copy link")).toBeVisible();
  },
};
