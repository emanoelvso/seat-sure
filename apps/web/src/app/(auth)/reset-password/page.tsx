import { env } from "@/config/env";
import { redirect } from "next/navigation";
import { paths } from "@/config/paths";
import {
  hasSession,
  readResetDoneCookie,
  readResetGrantCookie,
} from "@/features/auth/api/session-cookies";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

// AUTH-61, AUTH-70, AUTH-41: a signed-in visitor is sent home, and a
// visitor with no confirmed reset grant is sent to /forgot-password.
// ss_reset_done is a short breadcrumb written when resetPasswordAction
// just succeeded (see that action): since deleting ss_reset_grant makes
// Next.js refresh this Server Component, checking only the grant would
// bounce the visitor away right as the success dialog (AUTH-67) should
// render. Otherwise the shell renders the spec's title/description with
// the ResetPasswordForm.
export default async function ResetPasswordPage() {
  if (await hasSession()) {
    redirect(paths.home.getHref());
  }

  if (env.demoMode) redirect(paths.login.getHref());

  const [grant, resetDone] = await Promise.all([
    readResetGrantCookie(),
    readResetDoneCookie(),
  ]);
  if (!grant && !resetDone) {
    redirect(paths.forgotPassword.getHref());
  }

  return (
    <AuthShell
      title="Reset Password"
      subtitle="Enter a new password below to change your password."
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
