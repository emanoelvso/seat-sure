import { redirect } from "next/navigation";
import { paths } from "@/config/paths";
import { hasSession } from "@/features/auth/api/session-cookies";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { SignUpForm } from "@/features/auth/components/sign-up-form";

// AUTH-41: a signed-in visitor is sent home instead of seeing the form.
export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  if (await hasSession()) {
    redirect(paths.home.getHref());
  }

  const { redirectTo } = await searchParams;

  return (
    <AuthShell title="Please enter your details to sign up">
      <SignUpForm redirectTo={redirectTo} />
    </AuthShell>
  );
}
