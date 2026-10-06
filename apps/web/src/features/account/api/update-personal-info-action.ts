"use server";

import { redirect } from "next/navigation";
import { NO_SESSION, withAccessToken } from "@/features/auth/api/with-access-token";
import { GraphQLRequestError, graphqlServerFetch } from "@/lib/graphql-server";
import { UPDATE_MY_PROFILE } from "@/features/account/api/update-my-profile";
import {
  personalInfoSchema,
  toFormValues,
  type PersonalInfoFormState,
  type PersonalInfoValues,
} from "@/features/account/utils/personal-info-schema";
import { paths } from "@/config/paths";

const GENERIC_ERROR = "Something went wrong. Please try again.";

// PROFILE-03..06: the same rules run first (no API call on invalid values),
// then withAccessToken(UPDATE_MY_PROFILE), which refreshes the session once
// and retries. API field errors reach the form as-is, any other failure
// becomes a form-level error and the form keeps the entered values.
export async function updatePersonalInfoAction(
  _prevState: PersonalInfoFormState,
  values: PersonalInfoValues,
): Promise<PersonalInfoFormState> {
  const parsed = personalInfoSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string" && !fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    return { status: "error", fieldErrors };
  }

  let result;
  try {
    result = await withAccessToken((accessToken) =>
      graphqlServerFetch(
        UPDATE_MY_PROFILE,
        { input: parsed.data },
        { revalidate: 0, accessToken },
      ),
    );
  } catch (error) {
    if (
      error instanceof GraphQLRequestError &&
      error.reason === "INVALID_INPUT" &&
      error.fields
    ) {
      return { status: "error", fieldErrors: error.fields };
    }
    return { status: "error", fieldErrors: {}, formError: GENERIC_ERROR };
  }

  if (result === NO_SESSION) {
    redirect(paths.login.getHref(paths.accountPersonalInfo.getHref()));
  }

  return {
    status: "saved",
    saved: toFormValues(result.updateMyProfile),
    fieldErrors: {},
  };
}
