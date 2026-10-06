import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { expect, fn, screen, waitFor } from "storybook/test";
import { PersonalInfoForm } from "./personal-info-form";
import type {
  PersonalInfoFormState,
  PersonalInfoValues,
} from "@/features/account/utils/personal-info-schema";

const SAVED: PersonalInfoValues = {
  firstName: "Negar",
  lastName: "Khosravi",
  state: "California",
  city: "Los Angeles",
  birthDate: "1995-08-17",
  phoneCountryCode: "+49",
  phoneNumber: "558855488",
  zipCode: "90001",
};

const IDLE: PersonalInfoFormState = { status: "idle", fieldErrors: {} };
const onSave = fn();

// Fixed clock for the date picker, as in its own stories.
const TODAY = "2023-08-30";

// a11y "error" makes the addon's violations fail the story (preview.tsx
// only reports them).
const meta: Meta<typeof PersonalInfoForm> = {
  title: "Features/Account/PersonalInfoForm",
  component: PersonalInfoForm,
  tags: ["autodocs"],
  parameters: { a11y: { test: "error" } },
  args: {
    email: "negarkhosravii@yahoo.com",
    saved: SAVED,
    state: IDLE,
    pending: false,
    today: TODAY,
    onSave,
  },
  beforeEach: () => onSave.mockClear(),
  decorators: [
    (Story) => (
      <div className="w-[1128px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PersonalInfoForm>;

export default meta;

type Story = StoryObj<typeof PersonalInfoForm>;

// PROFILE-01 AC 3 and 4: every field is prefilled from `saved`, and the
// Email field is disabled and holds the user's email.
export const Prefilled: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("textbox", { name: "First Name" }),
    ).toHaveValue("Negar");
    await expect(
      canvas.getByRole("textbox", { name: "Last Name" }),
    ).toHaveValue("Khosravi");
    await expect(canvas.getByRole("textbox", { name: "State" })).toHaveValue(
      "California",
    );
    await expect(canvas.getByRole("textbox", { name: "City" })).toHaveValue(
      "Los Angeles",
    );
    await expect(canvas.getByRole("textbox", { name: "Zip code" })).toHaveValue(
      "90001",
    );
    await expect(
      canvas.getByRole("textbox", { name: "Phone number" }),
    ).toHaveValue("558855488");
    await expect(
      canvas.getByRole("combobox", { name: "Phone country code" }),
    ).toHaveTextContent("+49");
    await expect(
      canvas.getByRole("button", { name: /Date of birth/ }),
    ).toHaveTextContent("08/17/1995");

    const email = canvas.getByRole("textbox", { name: "Email" });
    await expect(email).toBeDisabled();
    await expect(email).toHaveValue("negarkhosravii@yahoo.com");
  },
};

// PROFILE-05 AC 14 and 15: Discard is disabled on an untouched form, enabled
// after a change, and restores every field.
export const DiscardRestoresSaved: Story = {
  play: async ({ canvas, userEvent }) => {
    const discard = canvas.getByRole("button", { name: "Discard" });
    await expect(discard).toBeDisabled();

    const firstName = canvas.getByRole("textbox", { name: "First Name" });
    const city = canvas.getByRole("textbox", { name: "City" });
    await userEvent.clear(firstName);
    await userEvent.type(firstName, "Sara");
    await userEvent.type(city, " Hills");
    await userEvent.click(
      canvas.getByRole("combobox", { name: "Phone country code" }),
    );
    await userEvent.click(await screen.findByRole("option", { name: "+33" }));
    await expect(discard).toBeEnabled();

    await userEvent.click(discard);
    await expect(firstName).toHaveValue("Negar");
    await expect(city).toHaveValue("Los Angeles");
    await expect(
      canvas.getByRole("combobox", { name: "Phone country code" }),
    ).toHaveTextContent("+49");
    await expect(discard).toBeDisabled();
  },
};

// PROFILE-03 AC 1 / PROFILE-05: Save is always enabled and submits the
// current values to the action.
export const SaveSubmitsValues: Story = {
  play: async ({ canvas, userEvent }) => {
    const save = canvas.getByRole("button", { name: "Save changes" });
    await expect(save).toBeEnabled();

    const zip = canvas.getByRole("textbox", { name: "Zip code" });
    await userEvent.clear(zip);
    await userEvent.type(zip, "10115");
    await userEvent.click(save);

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    await expect(onSave).toHaveBeenCalledWith({ ...SAVED, zipCode: "10115" });
  },
};

// PROFILE-05 AC 13: while a save is in flight the button reads "Saving…"
// and is disabled.
export const Pending: Story = {
  args: { pending: true },
  play: async ({ canvas }) => {
    const saving = canvas.getByRole("button", { name: "Saving…" });
    await expect(saving).toBeDisabled();
    await expect(
      canvas.queryByRole("button", { name: "Save changes" }),
    ).toBeNull();
  },
};

// PROFILE-04 AC 5-10: field errors render under their field with the error
// variant; `phone` goes under the phone number.
export const FieldErrors: Story = {
  args: {
    state: {
      status: "error",
      fieldErrors: {
        firstName: "Enter your name.",
        lastName: "Must be 50 characters or fewer.",
        state: "Must be 50 characters or fewer.",
        city: "Must be 50 characters or fewer.",
        zipCode: "Enter a valid zip code.",
        phone: "Enter a valid phone number.",
        birthDate: "Enter a valid date of birth.",
      },
    },
  },
  play: async ({ canvas }) => {
    for (const name of [
      "First Name",
      "Last Name",
      "State",
      "City",
      "Zip code",
      "Phone number",
    ]) {
      await expect(canvas.getByRole("textbox", { name })).toHaveAttribute(
        "aria-invalid",
        "true",
      );
    }
    await expect(
      canvas.getByRole("textbox", { name: "First Name" }),
    ).toHaveAccessibleDescription("Enter your name.");
    await expect(
      canvas.getByRole("textbox", { name: "Zip code" }),
    ).toHaveAccessibleDescription("Enter a valid zip code.");
    await expect(
      canvas.getByRole("textbox", { name: "Phone number" }),
    ).toHaveAccessibleDescription("Enter a valid phone number.");
    await expect(
      canvas.getByRole("button", { name: /Date of birth/ }),
    ).toHaveAccessibleDescription("Enter a valid date of birth.");
    await expect(
      canvas.getByRole("textbox", { name: "Email" }),
    ).not.toHaveAttribute("aria-invalid");
  },
};

// PROFILE-02 AC 2 (Edit AC): "Your changes have been saved." in a status
// element.
export const SavedStatus: Story = {
  args: { state: { status: "saved", saved: SAVED, fieldErrors: {} } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("status")).toHaveTextContent(
      "Your changes have been saved.",
    );
    await expect(canvas.queryByRole("alert")).toBeNull();
  },
};

// PROFILE-05 AC 12: any other failure shows the alert and keeps the entered
// values.
export const FormErrorKeepsValues: Story = {
  render: (args) => {
    const [state] = useState<PersonalInfoFormState>({
      status: "error",
      fieldErrors: {},
      formError: "Something went wrong. Please try again.",
    });
    return <PersonalInfoForm {...args} state={state} />;
  },
  play: async ({ canvas, userEvent }) => {
    const firstName = canvas.getByRole("textbox", { name: "First Name" });
    await userEvent.clear(firstName);
    await userEvent.type(firstName, "Sara");

    await expect(canvas.getByRole("alert")).toHaveTextContent(
      "Something went wrong. Please try again.",
    );
    await expect(canvas.queryByRole("status")).toBeNull();
    await expect(firstName).toHaveValue("Sara");
  },
};
