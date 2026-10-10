import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, waitFor, within } from "storybook/test";
import { useState } from "react";
import { ACCOUNT_SETTINGS } from "@/testing/account-settings.fixture";
import type {
  SettingsPatch,
  SettingsSaveResult,
} from "@/features/account/utils/settings-schema";
import { SettingsView } from "./settings-view";

const save = fn<(patch: SettingsPatch) => Promise<SettingsSaveResult>>();
const LABELS = [
  "Event Reminders",
  "Exclusive Offers & Discounts",
  "Ticket Availability Alerts",
  "Email notifications",
  "Push notifications",
];
const KEYS = [
  "eventReminders",
  "exclusiveOffers",
  "ticketAvailability",
  "emailNotifications",
  "pushNotifications",
] as const;
const INITIAL = [false, true, false, true, false];
const ERROR = "Couldn't save your settings. Please try again.";
const meta = {
  title: "Features/Account/SettingsView",
  component: SettingsView,
  parameters: { a11y: { test: "error" } },
  args: { settings: ACCOUNT_SETTINGS, action: save },
  beforeEach: () => {
    save.mockReset().mockResolvedValue({ ok: true });
  },
  decorators: [
    (Story) => (
      <div className="w-[1128px] max-w-full">
        <Story />
      </div>
    ),
  ],
  render: function ServerRefreshHarness(args) {
    const [settings, setSettings] = useState(args.settings);
    return (
      <SettingsView
        settings={settings}
        action={async (patch) => {
          const result = await args.action(patch);
          if ("ok" in result)
            setSettings((previous) => ({ ...previous, ...patch }));
          return result;
        }}
      />
    );
  },
} satisfies Meta<typeof SettingsView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { name: "Notification settings" }),
    ).toBeVisible();
    const switches = canvas.getAllByRole("switch");
    await expect(switches).toHaveLength(5);
    for (let i = 0; i < switches.length; i++) {
      await expect(switches[i]).toHaveAccessibleName(LABELS[i]);
      await expect(switches[i]).toHaveAttribute(
        "aria-checked",
        String(INITIAL[i]),
      );
    }
    await expect(
      canvas.getByText("Select your preferred language"),
    ).toBeVisible();
    await expect(
      canvas.getByRole("combobox", { name: "Language" }),
    ).toHaveTextContent("English");
    await expect(
      canvas.getByRole("combobox").querySelector("img"),
    ).toHaveAttribute("src", "/account/settings/english.svg");
    await expect(canvas.queryByRole("alert")).not.toBeInTheDocument();
  },
};
export const SavesEverySwitch: Story = {
  play: async ({ canvas, userEvent }) => {
    for (let i = 0; i < LABELS.length; i++) {
      const control = canvas.getByRole("switch", { name: LABELS[i] });
      await userEvent.click(control);
      await waitFor(() => expect(control).toBeEnabled());
      await expect(control).toHaveAttribute(
        "aria-checked",
        String(!INITIAL[i]),
      );
      await expect(save).toHaveBeenLastCalledWith({ [KEYS[i]]: !INITIAL[i] });
    }
    await expect(canvas.getByRole("status")).toHaveTextContent(
      "Settings saved.",
    );
    // A second change must start from the last server-acknowledged value.
    await userEvent.click(canvas.getByRole("switch", { name: LABELS[0] }));
    await waitFor(() =>
      expect(canvas.getByRole("switch", { name: LABELS[0] })).toBeEnabled(),
    );
    await expect(
      canvas.getByRole("switch", { name: LABELS[0] }),
    ).not.toBeChecked();
  },
};
export const LanguageKeyboard: Story = {
  play: async ({ canvas, userEvent }) => {
    const field = canvas.getByRole("combobox", { name: "Language" });
    field.focus();
    await userEvent.keyboard("{Enter}");
    const body = within(document.body);
    await expect(
      await body.findByRole("option", { name: "English" }),
    ).toBeVisible();
    await expect(
      body.getByRole("option", { name: "Portuguese (Brazil)" }),
    ).toBeVisible();
    await userEvent.keyboard("{End}{Enter}");
    await waitFor(() => expect(field).toBeEnabled());
    await expect(field).toHaveTextContent("Portuguese (Brazil)");
    await expect(save).toHaveBeenLastCalledWith({ language: "pt-BR" });
    await expect(canvas.getByRole("status")).toHaveTextContent(
      "Settings saved.",
    );
  },
};
export const RollbackAndRetry: Story = {
  play: async ({ canvas, userEvent }) => {
    save.mockResolvedValueOnce({ error: ERROR });
    const control = canvas.getByRole("switch", { name: "Event Reminders" });
    await userEvent.click(control);
    await expect(await canvas.findByRole("alert")).toHaveTextContent(ERROR);
    await expect(control).not.toBeChecked();
    await expect(control).toBeEnabled();
    await expect(canvas.getByRole("status")).not.toHaveTextContent(
      "Settings saved.",
    );
    await userEvent.click(control);
    await waitFor(() => expect(control).toBeEnabled());
    await expect(control).toBeChecked();
    await expect(canvas.queryByRole("alert")).not.toBeInTheDocument();
    await expect(canvas.getByRole("status")).toHaveTextContent(
      "Settings saved.",
    );
  },
};
export const LanguageRollback: Story = {
  play: async ({ canvas, userEvent }) => {
    save.mockResolvedValueOnce({ error: ERROR });
    const field = canvas.getByRole("combobox", { name: "Language" });
    await userEvent.click(field);
    await userEvent.click(
      await within(document.body).findByRole("option", {
        name: "Portuguese (Brazil)",
      }),
    );
    await expect(await canvas.findByRole("alert")).toHaveTextContent(ERROR);
    await expect(field).toHaveTextContent("English");
    await expect(field).toBeEnabled();
  },
};
export const TransportFailure: Story = {
  play: async ({ canvas, userEvent }) => {
    save.mockRejectedValueOnce(new Error("Connection lost"));
    const control = canvas.getByRole("switch", { name: "Email notifications" });
    await userEvent.click(control);
    await expect(await canvas.findByRole("alert")).toHaveTextContent(ERROR);
    await expect(control).toBeChecked();
    await expect(control).toBeEnabled();
  },
};
export const PendingSerializesChanges: Story = {
  play: async ({ canvas, userEvent }) => {
    let finish!: (result: SettingsSaveResult) => void;
    save.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const control = canvas.getByRole("switch", { name: "Event Reminders" });
    await userEvent.click(control);
    await expect(control).toBeChecked();
    for (const toggle of canvas.getAllByRole("switch"))
      await expect(toggle).toBeDisabled();
    await expect(
      canvas.getByRole("combobox", { name: "Language" }),
    ).toBeDisabled();
    await userEvent.click(
      canvas.getByRole("switch", { name: "Push notifications" }),
    );
    await expect(save).toHaveBeenCalledTimes(1);
    await expect(canvas.getByRole("status")).toHaveTextContent(
      "Saving settings…",
    );
    finish({ ok: true });
    await waitFor(() => expect(control).toBeEnabled());
    await expect(control).toBeChecked();
    await expect(
      canvas.getByRole("switch", { name: "Push notifications" }),
    ).not.toBeChecked();
  },
};
export const StoredPreferences: Story = {
  args: {
    settings: {
      ...ACCOUNT_SETTINGS,
      language: "pt-BR",
      eventReminders: true,
      exclusiveOffers: false,
      ticketAvailability: true,
      emailNotifications: false,
      pushNotifications: true,
    },
  },
  play: async ({ canvas }) => {
    for (let i = 0; i < LABELS.length; i++)
      await expect(
        canvas.getByRole("switch", { name: LABELS[i] }),
      ).toHaveAttribute("aria-checked", String(!INITIAL[i]));
    await expect(
      canvas.getByRole("combobox", { name: "Language" }),
    ).toHaveTextContent("Portuguese (Brazil)");
  },
};
export const Narrow: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: 320 }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas }) => {
    const section = canvas.getByRole("region", {
      name: "Notification settings",
    });
    await expect(section.scrollWidth).toBeLessThanOrEqual(section.clientWidth);
    for (const control of canvas.getAllByRole("switch")) {
      await expect(control).toBeVisible();
      await expect(control.getBoundingClientRect().right).toBeLessThanOrEqual(
        section.getBoundingClientRect().right,
      );
    }
  },
};
