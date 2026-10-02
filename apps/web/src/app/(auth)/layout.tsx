import type { ReactNode } from "react";

// Auth pages render their own full-screen AuthShell background (T27); this
// route group deliberately adds no header or footer around it.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return children;
}
