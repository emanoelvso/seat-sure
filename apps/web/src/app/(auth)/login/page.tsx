import { env } from "@/config/env";
import { DemoSignInForm } from "@/features/auth/components/demo-sign-in-form";
import { safeRedirect } from "@/features/auth/utils/safe-redirect";
import { redirect } from "next/navigation";
import { paths } from "@/config/paths";
import { hasSession } from "@/features/auth/api/session-cookies";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { LogInForm } from "@/features/auth/components/log-in-form";

// AUTH-41: a signed-in visitor is sent home instead of seeing the form.
export default async function LogInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  if (await hasSession()) {
    redirect(paths.home.getHref());
  }

  const { redirectTo } = await searchParams;

  if (env.demoMode) {
    return (
      <AuthShell title="Explore Seat Sure as a demo visitor">
        <DemoSignInForm redirectTo={safeRedirect(redirectTo)} />
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Please enter your email to log in">
      <LogInForm redirectTo={redirectTo} />
    </AuthShell>
  );
}
