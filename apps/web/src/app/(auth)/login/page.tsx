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

  return (
    <AuthShell title="Please enter your email to log in">
      <LogInForm redirectTo={redirectTo} />
    </AuthShell>
  );
}
