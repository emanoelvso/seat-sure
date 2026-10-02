import { Lobster } from "next/font/google";
import Link from "next/link";
import type { ReactNode } from "react";
import { paths } from "@/config/paths";

const lobster = Lobster({
  weight: "400",
  subsets: ["latin"],
});

// Deterministic star positions (percent of the glow area) so the background
// doesn't shift between renders.
const STARS = [
  { left: "8%", top: "14%" },
  { left: "18%", top: "38%" },
  { left: "28%", top: "10%" },
  { left: "40%", top: "28%" },
  { left: "52%", top: "6%" },
  { left: "63%", top: "22%" },
  { left: "72%", top: "40%" },
  { left: "82%", top: "12%" },
  { left: "90%", top: "32%" },
  { left: "48%", top: "44%" },
];

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

// The shared auth-pages frame (AUTH-01, AUTH-29): glow + stars background,
// the SeatSure wordmark linking home, a title/subtitle, and a narrow column
// for the form.
export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute left-1/2 top-0 h-[420px] w-[900px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-primary/30 blur-[120px]" />
        {STARS.map((star, index) => (
          <span
            key={index}
            className="absolute h-1 w-1 rounded-full bg-white/70"
            style={{ left: star.left, top: star.top }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center px-6 pb-16 pt-24">
        <Link
          href={paths.home.getHref()}
          className={`${lobster.className} text-[2.5rem] text-primary`}
        >
          SeatSure
        </Link>
        <h1 className="mt-8 text-center text-2xl font-semibold text-white">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-center text-sm text-neutral-300">
            {subtitle}
          </p>
        )}
        <div className="mt-8 w-full max-w-[424px]">{children}</div>
      </div>
    </div>
  );
}
