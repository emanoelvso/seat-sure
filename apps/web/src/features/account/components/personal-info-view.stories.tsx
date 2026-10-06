import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, waitFor } from "storybook/test";
import { PersonalInfoView } from "./personal-info-view";
import type { MyProfile } from "@/features/account/api/find-my-profile";
import type {
  PersonalInfoFormState,
  PersonalInfoValues,
} from "@/features/account/utils/personal-info-schema";

const PROFILE: MyProfile = {
  __typename: "UserProfile",
  id: "user-1",
  firstName: "Negar",
  lastName: "Khosravi",
  avatarUrl: null,
  state: "California",
  city: "Los Angeles",
  birthDate: "1995-08-17",
  phoneCountryCode: "+49",
  phoneNumber: "558855488",
  zipCode: "90001",
};

// Fake Server Action: echoes the values back as saved, with the phone number
// reduced to its digits like the real one (PROFILE-03).
const action = fn(
  async (
    _prev: PersonalInfoFormState,
    values: PersonalInfoValues,
  ): Promise<PersonalInfoFormState> => ({
    status: "saved",
    saved: { ...values, phoneNumber: values.phoneNumber.replace(/[ -]/g, "") },
    fieldErrors: {},
  }),
);

// a11y "error" makes the addon's violations fail the story (preview.tsx
// only reports them).
const meta: Meta<typeof PersonalInfoView> = {
  title: "Features/Account/PersonalInfoView",
  component: PersonalInfoView,
  tags: ["autodocs"],
  parameters: { a11y: { test: "error" } },
  args: {
    email: "negarkhosravii@yahoo.com",
    profile: PROFILE,
    today: "2023-08-30",
    action,
  },
  beforeEach: () => {
    action.mockClear();
  },
  decorators: [
    (Story) => (
      <div className="w-[1128px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PersonalInfoView>;

export default meta;

type Story = StoryObj<typeof PersonalInfoView>;

// PROFILE-01: the card and the form render from the profile.
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { name: "Hey Negar!" }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("textbox", { name: "First Name" }),
    ).toHaveValue("Negar");
    await expect(
      canvas.getByRole("button", { name: "Discard" }),
    ).toBeDisabled();
  },
};

// PROFILE-03 AC 2 and PROFILE-05 AC 14: saving a new first name shows the
// status message, updates the greeting and leaves Discard disabled (the form
// now equals the saved values).
export const SaveUpdatesGreeting: Story = {
  play: async ({ canvas, userEvent }) => {
    const firstName = canvas.getByRole("textbox", { name: "First Name" });
    await userEvent.clear(firstName);
    await userEvent.type(firstName, "Sara");
    await expect(canvas.getByRole("button", { name: "Discard" })).toBeEnabled();

    await userEvent.click(canvas.getByRole("button", { name: "Save changes" }));

    await expect(await canvas.findByRole("status")).toHaveTextContent(
      "Your changes have been saved.",
    );
    await expect(
      canvas.getByRole("heading", { name: "Hey Sara!" }),
    ).toBeVisible();
    await expect(firstName).toHaveValue("Sara");
    await expect(
      canvas.getByRole("button", { name: "Discard" }),
    ).toBeDisabled();
    await expect(action).toHaveBeenCalledTimes(1);
    await expect(action.mock.calls[0][1]).toEqual({
      ...PROFILE_VALUES,
      firstName: "Sara",
    });
  },
};

const PROFILE_VALUES: PersonalInfoValues = {
  firstName: "Negar",
  lastName: "Khosravi",
  state: "California",
  city: "Los Angeles",
  birthDate: "1995-08-17",
  phoneCountryCode: "+49",
  phoneNumber: "558855488",
  zipCode: "90001",
};

// PROFILE-03 edge case: the API returns the digits only, and the field shows
// that normalized value after the save.
export const ShowsNormalizedPhone: Story = {
  play: async ({ canvas, userEvent }) => {
    const phone = canvas.getByRole("textbox", { name: "Phone number" });
    await userEvent.clear(phone);
    await userEvent.type(phone, "5588 554 77");
    await expect(phone).toHaveValue("5588 554 77");

    await userEvent.click(canvas.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(phone).toHaveValue("558855477"));
    await expect(
      canvas.getByRole("button", { name: "Discard" }),
    ).toBeDisabled();
  },
};

// PROFILE-05 AC 12: a failed save keeps the entered values and the last
// saved ones (Discard still restores them).
export const FailedSaveKeepsValues: Story = {
  args: {
    action: async () => ({
      status: "error",
      fieldErrors: {},
      formError: "Something went wrong. Please try again.",
    }),
  },
  play: async ({ canvas, userEvent }) => {
    const firstName = canvas.getByRole("textbox", { name: "First Name" });
    await userEvent.clear(firstName);
    await userEvent.type(firstName, "Sara");
    await userEvent.click(canvas.getByRole("button", { name: "Save changes" }));

    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "Something went wrong. Please try again.",
    );
    await expect(firstName).toHaveValue("Sara");
    await expect(
      canvas.getByRole("heading", { name: "Hey Negar!" }),
    ).toBeVisible();

    await userEvent.click(canvas.getByRole("button", { name: "Discard" }));
    await expect(firstName).toHaveValue("Negar");
  },
};
