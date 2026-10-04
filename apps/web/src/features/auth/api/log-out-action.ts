"use server";

import { redirect } from "next/navigation";
import { clearSessionCookies } from "@/features/auth/api/session-cookies";
import { paths } from "@/config/paths";

export async function logOutAction(): Promise<void> {
  await clearSessionCookies();
  redirect(paths.home.getHref());
}
