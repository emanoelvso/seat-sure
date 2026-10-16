import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, mocked, waitFor } from "storybook/test";
import type { DemoSignInState } from "@/features/auth/api/demo-sign-in-action";
import { DemoSignInForm } from "./demo-sign-in-form";
type DemoAction = NonNullable<React.ComponentProps<typeof DemoSignInForm>["action"]>;
const meta: Meta<typeof DemoSignInForm> = { title: "Features/Auth/DemoSignInForm", component: DemoSignInForm, args: { action: fn<DemoAction>(async () => ({})) } } satisfies Meta<typeof DemoSignInForm>;
export default meta;
type Story = StoryObj<typeof DemoSignInForm>;
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Sign in as demo" })).toBeEnabled();
    await expect(canvas.queryByLabelText("Email")).not.toBeInTheDocument();
    await expect(canvas.queryByLabelText("Password")).not.toBeInTheDocument();
    await expect(canvas.getByText("Each sign-in creates a separate temporary account.")).toBeVisible();
  },
};
export const SafeReturnPath: Story = {
  args: { redirectTo: "/events?type=concert", action: fn<DemoAction>(async () => ({})) },
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Sign in as demo" }));
    await expect(args.action).toHaveBeenCalled();
    const submitted = mocked(args.action!).mock.calls[0][1] as FormData;
    await expect([...submitted]).toEqual([["redirectTo", "/events?type=concert"]]);
  },
};
let finishPending: (state: DemoSignInState) => void;
export const Pending: Story = {
  args: { action: fn<DemoAction>(() => new Promise<DemoSignInState>(resolve => { finishPending = resolve; })) },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Sign in as demo" }));
    await expect(canvas.getByRole("button", { name: "Signing in…" })).toBeDisabled();
    await expect(canvas.getByRole("status")).toHaveTextContent("Creating your demo account…");
    finishPending({});
    await waitFor(() => expect(canvas.getByRole("button", { name: "Sign in as demo" })).toBeEnabled());
  },
};
export const RetryableError: Story = {
  args: { action: fn<DemoAction>(async () => ({ formError: "Demo sign-in is unavailable. Please try again." })) },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Sign in as demo" }));
    await expect(canvas.getByRole("alert")).toHaveTextContent("Demo sign-in is unavailable. Please try again.");
    await expect(canvas.getByRole("button", { name: "Sign in as demo" })).toBeEnabled();
  },
};
