import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import type {
  CodeVerificationConfirmState,
  CodeVerificationResendState,
} from "./code-verification-form";
import { CodeVerificationForm } from "./code-verification-form";

const meta: Meta<typeof CodeVerificationForm> = {
  title: "Features/Auth/CodeVerificationForm",
  tags: ["autodocs"],
  component: CodeVerificationForm,
} satisfies Meta<typeof CodeVerificationForm>;

export default meta;

type Story = StoryObj<typeof CodeVerificationForm>;

const VERIFY_EMAIL_TITLE = "Email Verification Code";
const VERIFY_EMAIL_DESCRIPTION =
  "We've sent a 6-digit confirmation code to your email. Please enter the code in the box below to verify your email.";

// A fixed instant so countdown assertions never depend on real elapsed time.
const NOW = new Date("2026-01-01T00:00:00.000Z").getTime();
const fixedNow = () => NOW;

const emptyConfirmState: CodeVerificationConfirmState = {};

const CODE = "527655";

// AUTH-14: the exact verify-email title and description render.
export const Default: Story = {
  args: {
    purpose: "verify-email",
    title: VERIFY_EMAIL_TITLE,
    description: VERIFY_EMAIL_DESCRIPTION,
    resendAvailableAt: new Date(NOW + 45_000).toISOString(),
    codeSent: true,
    confirmAction: fn(async (): Promise<CodeVerificationConfirmState> => emptyConfirmState),
    resendAction: fn(async (): Promise<CodeVerificationResendState> => ({})),
    now: fixedNow,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(VERIFY_EMAIL_TITLE)).toBeVisible();
    await expect(canvas.getByText(VERIFY_EMAIL_DESCRIPTION)).toBeVisible();
    await expect(canvas.getByText("Didn't receive the code?")).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: "Confirm" }),
    ).toBeDisabled();
  },
};

// AUTH-15: Confirm stays disabled with 5 digits and enables at 6.
export const ConfirmEnablesAtSixDigits: Story = {
  args: {
    ...Default.args,
  },
  play: async ({ canvas, userEvent }) => {
    for (const [index, digit] of "52765".split("").entries()) {
      await userEvent.type(canvas.getByLabelText(`Digit ${index + 1}`), digit);
    }
    await expect(
      canvas.getByRole("button", { name: "Confirm" }),
    ).toBeDisabled();

    await userEvent.type(canvas.getByLabelText("Digit 6"), "5");
    await expect(
      canvas.getByRole("button", { name: "Confirm" }),
    ).toBeEnabled();
  },
};

// AUTH-25: 45 seconds ahead of now, "Resend" is disabled and shows 00:45.
export const ResendCountdownDisabled: Story = {
  args: {
    ...Default.args,
    resendAvailableAt: new Date(NOW + 45_000).toISOString(),
    codeSent: true,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("00:45")).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: "Resend" }),
    ).toBeDisabled();
  },
};

// AUTH-25 edge case: once the countdown reaches 0, "Resend" is enabled and
// shows 00:00.
export const ResendEnabledAtZero: Story = {
  args: {
    ...Default.args,
    resendAvailableAt: new Date(NOW).toISOString(),
    codeSent: true,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("00:00")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Resend" })).toBeEnabled();
  },
};

// AUTH-26: clicking "Resend" after the countdown calls resendAction and
// restarts the countdown at 01:00.
export const ResendClickRestartsCountdown: Story = {
  args: {
    ...Default.args,
    resendAvailableAt: new Date(NOW).toISOString(),
    codeSent: true,
    resendAction: fn(
      async (): Promise<CodeVerificationResendState> => ({
        resendAvailableAt: new Date(NOW + 60_000).toISOString(),
        codeSent: true,
      }),
    ),
  },
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Resend" }));

    await expect(args.resendAction).toHaveBeenCalledWith("verify-email");
    await expect(await canvas.findByText("01:00")).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: "Resend" }),
    ).toBeDisabled();
  },
};

// AUTH-21: a wrong code shows "Incorrect code. Please try again.", clears
// the boxes, and focuses the first one.
export const CodeIncorrectClearsBoxes: Story = {
  args: {
    ...Default.args,
    confirmAction: fn(
      async (): Promise<CodeVerificationConfirmState> => ({
        error: "CODE_INCORRECT",
      }),
    ),
  },
  play: async ({ canvas, userEvent }) => {
    for (const [index, digit] of CODE.split("").entries()) {
      await userEvent.type(canvas.getByLabelText(`Digit ${index + 1}`), digit);
    }
    await userEvent.click(canvas.getByRole("button", { name: "Confirm" }));

    await expect(
      canvas.getByText("Incorrect code. Please try again."),
    ).toBeVisible();
    for (let index = 1; index <= 6; index += 1) {
      await expect(canvas.getByLabelText(`Digit ${index}`)).toHaveValue("");
    }
    await expect(canvas.getByLabelText("Digit 1")).toHaveFocus();
  },
};

// AUTH-22: an expired code shows its exact message.
export const CodeExpired: Story = {
  args: {
    ...Default.args,
    confirmAction: fn(
      async (): Promise<CodeVerificationConfirmState> => ({
        error: "CODE_EXPIRED",
      }),
    ),
  },
  play: async ({ canvas, userEvent }) => {
    for (const [index, digit] of CODE.split("").entries()) {
      await userEvent.type(canvas.getByLabelText(`Digit ${index + 1}`), digit);
    }
    await userEvent.click(canvas.getByRole("button", { name: "Confirm" }));

    await expect(
      canvas.getByText("This code has expired. Request a new one."),
    ).toBeVisible();
  },
};

// AUTH-23: too many wrong attempts shows its exact message.
export const CodeAttemptsExceeded: Story = {
  args: {
    ...Default.args,
    confirmAction: fn(
      async (): Promise<CodeVerificationConfirmState> => ({
        error: "CODE_ATTEMPTS_EXCEEDED",
      }),
    ),
  },
  play: async ({ canvas, userEvent }) => {
    for (const [index, digit] of CODE.split("").entries()) {
      await userEvent.type(canvas.getByLabelText(`Digit ${index + 1}`), digit);
    }
    await userEvent.click(canvas.getByRole("button", { name: "Confirm" }));

    await expect(
      canvas.getByText("Too many incorrect attempts. Request a new code."),
    ).toBeVisible();
  },
};

// AUTH-13: when the code couldn't be sent, the send-failure message shows
// and "Resend" is enabled even though the countdown hasn't elapsed.
export const SendFailure: Story = {
  args: {
    ...Default.args,
    resendAvailableAt: new Date(NOW + 45_000).toISOString(),
    codeSent: false,
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText("We couldn't send the code. Please try again."),
    ).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Resend" })).toBeEnabled();
  },
};
