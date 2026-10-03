import { redirect } from "next/navigation";
import { paths } from "@/config/paths";
import { hasSession } from "@/features/auth/api/session-cookies";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

// AUTH-56, AUTH-41: a signed-in visitor is sent home; otherwise the shell
// renders the spec's title/description with the ForgotPasswordForm.
export default async function ForgotPasswordPage() {
  if (await hasSession()) {
    redirect(paths.home.getHref());
  }

  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="Please enter the email address associated with your account and we'll send you a verification code."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
