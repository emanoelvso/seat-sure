"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import {
  NO_SESSION,
  withAccessToken,
} from "@/features/auth/api/with-access-token";
import { graphqlServerFetch } from "@/lib/graphql-server";
import { paths } from "@/config/paths";
import { UPDATE_MY_SETTINGS } from "@/features/account/api/update-my-settings";
import {
  settingsPatchSchema,
  SETTINGS_SAVE_ERROR,
  type SettingsPatch,
  type SettingsSaveResult,
} from "@/features/account/utils/settings-schema";

export async function updateSettingsAction(
  patch: SettingsPatch,
): Promise<SettingsSaveResult> {
  const parsed = settingsPatchSchema.safeParse(patch);
  if (!parsed.success) return { error: SETTINGS_SAVE_ERROR };

  let result;
  try {
    result = await withAccessToken((accessToken) =>
      graphqlServerFetch(
        UPDATE_MY_SETTINGS,
        { input: parsed.data },
        { revalidate: 0, accessToken },
      ),
    );
  } catch {
    return { error: SETTINGS_SAVE_ERROR };
  }
  if (result === NO_SESSION)
    redirect(paths.login.getHref(paths.accountSettings.getHref()));

  refresh();
  return { ok: true };
}
