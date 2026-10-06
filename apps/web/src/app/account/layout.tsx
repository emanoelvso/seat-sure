import type { ReactNode } from "react";
import { Header } from "@/components/layouts/header";
import { AccountSidebar } from "@/features/account/components/account-sidebar";

// Account shell (ACCT-01), from the Figma frame grid 5011:121182: 24px page
// padding, the 240x832 sidebar, then a column with the search header and the
// page, 22px apart. No data and no auth here: each page's loader guards
// itself through protectedPageFetch, so the shell never reads cookies.
export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-6 p-6">
      <AccountSidebar className="h-[832px]" />
      <div className="flex min-w-0 grow flex-col gap-[22px]">
        <Header searchMode className="!mb-0" />
        <main>{children}</main>
      </div>
    </div>
  );
}
