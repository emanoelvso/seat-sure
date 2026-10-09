import { getSettingsPageData } from "@/features/account/api/get-settings-page-data";
import { updateSettingsAction } from "@/features/account/api/update-settings-action";
import { SettingsView } from "@/features/account/components/settings-view";

export default async function AccountSettingsPage() {
  const settings = await getSettingsPageData();
  return <SettingsView settings={settings} action={updateSettingsAction} />;
}
