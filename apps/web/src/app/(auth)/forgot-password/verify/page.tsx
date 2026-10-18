import { env } from "@/config/env";
import { redirect } from "next/navigation";
import { paths } from "@/config/paths";
import { resendCodeAction } from "@/features/auth/api/resend-code-action";
import {
  hasSession,
  readResetPendingCookie,
} from "@/features/auth/api/session-cookies";
import { verifyCodeAction } from "@/features/auth/api/verify-code-action";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { CodeVerificationForm } from "@/features/auth/components/code-verification-form";

interface ResetPendingCookie {
  resendAvailableAt: string;
  codeSent: boolean;
}

const TITLE = "Request sent successfully!";
const DESCRIPTION =
  "We've sent a 6-digit confirmation code to your email. Please enter the code in the box below to verify your reset password request.";

// AUTH-60, AUTH-70, AUTH-41: a signed-in visitor is sent home, a visitor
// with no pending reset is sent to /forgot-password, and otherwise the
// shared CodeVerificationForm renders bound to the "reset-password"
// purpose.
export default async function ForgotPasswordVerifyPage() {
  if (await hasSession()) {
    redirect(paths.home.getHref());
  }

  if (env.demoMode) redirect(paths.login.getHref());

  const pending = await readResetPendingCookie<ResetPendingCookie>();
  if (!pending) {
    redirect(paths.forgotPassword.getHref());
  }

  return (
    <AuthShell title="">
      <CodeVerificationForm
        purpose="reset-password"
        title={TITLE}
        description={DESCRIPTION}
        resendAvailableAt={pending.resendAvailableAt}
        codeSent={pending.codeSent}
        confirmAction={verifyCodeAction}
        resendAction={resendCodeAction}
      />
    </AuthShell>
  );
}
