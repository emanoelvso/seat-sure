"use client";

import { useActionState, useState } from "react";
import type { MyProfile } from "@/features/account/api/find-my-profile";
import { updatePersonalInfoAction } from "@/features/account/api/update-personal-info-action";
import { PersonalInfoForm } from "@/features/account/components/personal-info-form";
import { ProfileCard } from "@/features/account/components/profile-card";
import {
  toFormValues,
  type PersonalInfoFormState,
  type PersonalInfoValues,
} from "@/features/account/utils/personal-info-schema";

type PersonalInfoAction = (
  state: PersonalInfoFormState,
  values: PersonalInfoValues,
) => Promise<PersonalInfoFormState>;

interface PersonalInfoViewProps {
  email: string;
  profile: MyProfile;
  // Defaults to the real Server Action; Storybook passes a fake one so
  // play() can drive a save without a server.
  action?: PersonalInfoAction;
  // 'YYYY-MM-DD'; fixes the date picker's clock in stories.
  today?: string;
}

const initialState: PersonalInfoFormState = { status: "idle", fieldErrors: {} };

// Personal info page body (PROFILE-03, PROFILE-05), laid out as Figma
// 5011:120439: the profile card, 40px, the form. It holds the last saved
// values: the profile first, then whatever the action returns. The greeting
// and the form's Discard both follow them.
export function PersonalInfoView({
  email,
  profile,
  action = updatePersonalInfoAction,
  today,
}: PersonalInfoViewProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [saved, setSaved] = useState(() => toFormValues(profile));

  // A failed save has no `saved`: keep the last one. Updated while rendering
  // so the card and the form never show a stale frame.
  if (state.saved && state.saved !== saved) setSaved(state.saved);

  return (
    <div className="flex flex-col gap-10">
      <ProfileCard
        firstName={saved.firstName}
        lastName={saved.lastName}
        email={email}
        avatarUrl={profile.avatarUrl}
      />
      <PersonalInfoForm
        email={email}
        saved={saved}
        state={state}
        pending={pending}
        today={today}
        onSave={formAction}
      />
    </div>
  );
}
