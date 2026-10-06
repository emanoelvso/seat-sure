import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { qrCodePath } from "@/testing/qr-code";
import { OrderQrCode } from "./order-qr-code";

const meta: Meta<typeof OrderQrCode> = {
  title: "Features/Account/OrderQrCode",
  component: OrderQrCode,
  tags: ["autodocs"],
  // a11y "error" makes the addon's violations fail the story (preview.tsx
  // only reports them).
  parameters: { a11y: { test: "error" } },
  args: { orderId: "3f2a9c1b-7d4e-4a2b-9c1d-2e3f4a5b6c7d" },
} satisfies Meta<typeof OrderQrCode>;

export default meta;

type Story = StoryObj<typeof OrderQrCode>;

// ORDDETAIL-02 AC 5: the QR code is one image named "Order QR code", drawn
// as an SVG that encodes the order id.
export const Default: Story = {
  play: async ({ canvas }) => {
    const qrCode = canvas.getByRole("img", { name: "Order QR code" });
    await expect(qrCode.querySelector("svg")).not.toBeNull();
    const paths = qrCode.querySelectorAll("svg path");
    const drawn = paths[paths.length - 1]?.getAttribute("d");
    await expect(drawn).toBe(qrCodePath(meta.args!.orderId!));
    await expect(drawn).not.toBe(qrCodePath("seat-sure"));
  },
};
