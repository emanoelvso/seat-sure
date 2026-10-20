import { deleteAccountAction } from "@/features/account/api/delete-account-action";
import { getSettingsPageData } from "@/features/account/api/get-settings-page-data";
import { updateSettingsAction } from "@/features/account/api/update-settings-action";
import { DeleteAccountSection } from "@/features/account/components/delete-account-section";
import { SettingsView } from "@/features/account/components/settings-view";

export default async function AccountSettingsPage() {
  const settings = await getSettingsPageData();
  return (
    <div className="flex flex-col gap-6">
      <SettingsView settings={settings} action={updateSettingsAction} />
      <DeleteAccountSection action={deleteAccountAction} />
    </div>
  );
}
