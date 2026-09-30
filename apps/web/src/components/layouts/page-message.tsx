import { ReactNode } from "react";
import { Header } from "@/components/layouts/header";

export function PageMessage({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <div className="flex flex-col items-start gap-6 px-27 pb-25">
        {children}
      </div>
    </>
  );
}
