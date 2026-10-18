"use server";

import { redirect } from "next/navigation";
import { env } from "@/config/env";
import { DEMO_SIGN_IN } from "@/features/auth/api/demo-sign-in";
import { setSessionCookies } from "@/features/auth/api/session-cookies";
import { safeRedirect } from "@/features/auth/utils/safe-redirect";
import { graphqlServerFetch } from "@/lib/graphql-server";

export interface DemoSignInState {
  formError?: string;
}

const GENERIC_ERROR = "Demo sign-in is unavailable. Please try again.";

export async function demoSignInAction(
  _prevState: DemoSignInState,
  formData: FormData,
): Promise<DemoSignInState> {
  if (!env.demoMode) return { formError: GENERIC_ERROR };

  let session;
  try {
    ({ demoSignIn: session } = await graphqlServerFetch(
      DEMO_SIGN_IN,
      {},
      { revalidate: 0 },
    ));
  } catch {
    return { formError: GENERIC_ERROR };
  }

  if (!session?.accessToken || !session.refreshToken || session.persistent) {
    return { formError: GENERIC_ERROR };
  }

  await setSessionCookies(session);
  const returnPath = formData.get("redirectTo");
  redirect(safeRedirect(typeof returnPath === "string" ? returnPath : ""));
}
