import { Lobster } from "next/font/google";
import Link from "next/link";
import { paths } from "@/config/paths";

const lobster = Lobster({
  weight: "400",
  subsets: ["latin"],
});

interface BrandLogoProps {
  className?: string;
}

// The Lobster "SeatSure" wordmark linking home, shared by the header and
// the account sidebar (ACCT-01).
export function BrandLogo({ className = "" }: BrandLogoProps) {
  return (
    <Link
      href={paths.home.getHref()}
      className={`${lobster.className} text-tint-500 ${className}`}
    >
      SeatSure
    </Link>
  );
}
