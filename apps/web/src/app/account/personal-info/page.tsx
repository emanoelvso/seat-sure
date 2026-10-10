import { paths } from "@/config/paths";
import { getPersonalInfoPageData } from "@/features/account/api/get-personal-info-page-data";
import { PersonalInfoView } from "@/features/account/components/personal-info-view";

// The signed-in user's personal info (PROFILE-01, PROFILE-02). The loader
// redirects a visitor without a session; any other failure falls to
// app/account/error.tsx.
export default async function AccountPersonalInfoPage() {
  const { email, profile } = await getPersonalInfoPageData(
    paths.accountPersonalInfo.getHref(),
  );

  return <PersonalInfoView email={email} profile={profile} />;
}
