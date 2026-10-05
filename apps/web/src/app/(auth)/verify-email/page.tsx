import { redirect } from "next/navigation";
import { paths } from "@/config/paths";
import { resendCodeAction } from "@/features/auth/api/resend-code-action";
import { hasSession, readPendingCookie } from "@/features/auth/api/session-cookies";
import { verifyCodeAction } from "@/features/auth/api/verify-code-action";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { CodeVerificationForm } from "@/features/auth/components/code-verification-form";

interface PendingCookie {
  resendAvailableAt: string;
  codeSent: boolean;
}

const TITLE = "Email Verification Code";
const DESCRIPTION =
  "We've sent a 6-digit confirmation code to your email. Please enter the code in the box below to verify your email.";

// AUTH-14, AUTH-28, AUTH-41: a signed-in visitor is sent home, a visitor
// with no pending verification is sent to /login, and otherwise the shared
// CodeVerificationForm renders bound to the "verify-email" purpose.
export default async function VerifyEmailPage() {
  if (await hasSession()) {
    redirect(paths.home.getHref());
  }

  const pending = await readPendingCookie<PendingCookie>();
  if (!pending) {
    redirect(paths.login.getHref());
  }

  return (
    <AuthShell title="">
      <CodeVerificationForm
        purpose="verify-email"
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
