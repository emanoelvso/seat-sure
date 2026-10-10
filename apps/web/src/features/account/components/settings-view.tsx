"use client";

import Image from "next/image";
import { unstable_rethrow } from "next/navigation";
import {
  startTransition,
  useActionState,
  useId,
  useOptimistic,
  useRef,
} from "react";
import { Select } from "radix-ui";
import { AltArrowDownIcon } from "@solar-icons/react/outline";
import type { MySettings } from "@/features/account/api/find-my-settings";
import {
  SETTINGS_SAVE_ERROR,
  type SettingsPatch,
  type SettingsSaveResult,
} from "@/features/account/utils/settings-schema";
import { SettingCard } from "./setting-card";

const NOTIFICATION_SETTINGS = [
  {
    key: "eventReminders",
    title: "Event Reminders",
    description: "Get notified before your event starts, so you never miss it!",
  },
  {
    key: "exclusiveOffers",
    title: "Exclusive Offers & Discounts",
    description: "Receive special offers and discounts only available for you.",
  },
  {
    key: "ticketAvailability",
    title: "Ticket Availability Alerts",
    description:
      "Get notified when tickets for your desired event are available for purchase.",
  },
  {
    key: "emailNotifications",
    title: "Email notifications",
    description:
      "Stay updated with event news and updates directly to your email.",
  },
  {
    key: "pushNotifications",
    title: "Push notifications",
    description:
      "Receive instant updates and alerts on your phone for upcoming events and offers.",
  },
] as const;

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "pt-BR", label: "Portuguese (Brazil)" },
] as const;

interface SettingsViewProps {
  settings: MySettings;
  action: (patch: SettingsPatch) => Promise<SettingsSaveResult>;
}

export function SettingsView({ settings, action }: SettingsViewProps) {
  const id = useId();
  const saving = useRef(false);
  const [optimistic, changeOptimistic] = useOptimistic(
    settings,
    (current, patch: SettingsPatch) => ({ ...current, ...patch }),
  );
  const [result, dispatch, pending] = useActionState<
    SettingsSaveResult | null,
    SettingsPatch
  >(async (_previous, patch) => {
    try {
      return await action(patch);
    } catch (error) {
      // Server Action transport failures are retryable; Next redirects must
      // still reach the router when a session expires.
      unstable_rethrow(error);
      return { error: SETTINGS_SAVE_ERROR };
    } finally {
      saving.current = false;
    }
  }, null);

  function change(patch: SettingsPatch) {
    if (saving.current) return;
    saving.current = true;
    startTransition(() => {
      changeOptimistic(patch);
      dispatch(patch);
    });
  }

  return (
    <div className="@container w-full">
      <section
        aria-labelledby={`${id}-heading`}
        className="flex w-full flex-col gap-6 rounded-3xl bg-neutral-1000 p-6 @min-[640px]:p-10"
      >
        <h1
          id={`${id}-heading`}
          className="text-2xl leading-[29px] font-bold text-white"
        >
          Notification settings
        </h1>
        {!pending && result && "error" in result && (
          <p role="alert" className="text-sm text-error-200">
            {result.error}
          </p>
        )}
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            {NOTIFICATION_SETTINGS.map(({ key, title, description }) => (
              <SettingCard
                key={key}
                title={title}
                description={
                  key === "eventReminders" ? (
                    <strong>{description}</strong>
                  ) : (
                    description
                  )
                }
                checked={optimistic[key]}
                disabled={pending}
                onCheckedChange={(checked) => change({ [key]: checked })}
              />
            ))}
          </div>
          <div className="flex w-full max-w-[452px] flex-col gap-8">
            <h2 className="text-lg leading-[22px] font-bold text-white">
              Select your preferred language
            </h2>
            <div className="relative">
              <span
                id={`${id}-language`}
                className="absolute -top-2 left-4 z-10 bg-neutral-1000 px-1 text-sm leading-[17px] text-neutral-200"
              >
                Language
              </span>
              <Select.Root
                value={optimistic.language}
                disabled={pending}
                onValueChange={(language) => {
                  if (language === "en" || language === "pt-BR")
                    change({ language });
                }}
              >
                <Select.Trigger
                  aria-labelledby={`${id}-language`}
                  className="flex h-14 w-full cursor-pointer items-center justify-between gap-2 rounded-lg bg-neutral-900 px-5 text-lg leading-[22px] text-neutral-100 outline-none focus-visible:ring-2 focus-visible:ring-tint-400 disabled:cursor-wait"
                >
                  <Select.Value />
                  <Select.Icon>
                    <AltArrowDownIcon
                      size={24}
                      className="text-white"
                      aria-hidden
                    />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content
                    position="popper"
                    sideOffset={8}
                    className="z-50 w-(--radix-select-trigger-width) rounded-lg bg-neutral-700 p-2 shadow-lg"
                  >
                    <Select.Viewport>
                      {LANGUAGES.map(({ value, label }) => (
                        <Select.Item
                          key={value}
                          value={value}
                          className="cursor-pointer rounded-md px-3 py-3 text-base text-white outline-none select-none data-[highlighted]:bg-neutral-500 data-[state=checked]:bg-neutral-500"
                        >
                          <Select.ItemText>
                            <span className="flex items-center gap-2">
                              {value === "en" && (
                                <Image
                                  src="/account/settings/english.svg"
                                  alt=""
                                  width={24}
                                  height={24}
                                  unoptimized
                                />
                              )}
                              {label}
                            </span>
                          </Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>
          </div>
        </div>
        <p role="status" className="sr-only">
          {pending
            ? "Saving settings…"
            : result && "ok" in result
              ? "Settings saved."
              : ""}
        </p>
      </section>
    </div>
  );
}
