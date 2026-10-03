import { redirect } from "next/navigation";
import { paths } from "@/config/paths";
import {
  hasSession,
  readResetGrantCookie,
} from "@/features/auth/api/session-cookies";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

// AUTH-61, AUTH-70, AUTH-41: a signed-in visitor is sent home, a visitor
// with no confirmed reset grant is sent to /forgot-password, and otherwise
// the shell renders the spec's title/description with the
// ResetPasswordForm.
export default async function ResetPasswordPage() {
  if (await hasSession()) {
    redirect(paths.home.getHref());
  }

  const grant = await readResetGrantCookie();
  if (!grant) {
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
