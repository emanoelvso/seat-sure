import {
  SquareAltArrowLeftIcon,
  VerifiedCheckIcon,
} from "@solar-icons/react/outline";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { paths } from "@/config/paths";

interface PaymentSuccessProps {
  email: string;
}

// Decorative star field: scattered radial-gradient dots tiled at offset
// sizes so the pattern doesn't read as a grid.
const STARS =
  "radial-gradient(1.5px 1.5px at 20px 30px, var(--color-neutral-200), transparent)," +
  "radial-gradient(1px 1px at 90px 120px, var(--color-neutral-100), transparent)," +
  "radial-gradient(1.5px 1.5px at 160px 60px, var(--color-neutral-300), transparent)," +
  "radial-gradient(1px 1px at 50px 170px, var(--color-neutral-200), transparent)," +
  "radial-gradient(1px 1px at 230px 200px, var(--color-neutral-100), transparent)";

// PAY-54: the payment success view. No "Go to profile" (spec Assumptions).
export function PaymentSuccess({ email }: PaymentSuccessProps) {
  return (
    <div className="relative flex min-h-[640px] items-center justify-center overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage: STARS,
          backgroundSize: "250px 250px, 190px 190px, 310px 310px, 270px 270px, 350px 350px",
        }}
      />
      <div className="relative flex flex-col items-center gap-2 text-center text-white">
        <div className="relative">
          <h1 className="text-4xl font-bold text-tint-500">Thank You!</h1>
          <VerifiedCheckIcon
            size={40}
            aria-hidden="true"
            className="absolute -right-10 -top-8 text-tint-400"
          />
        </div>
        <p className="text-xl">Your payment was successful</p>
        <p className="mt-6">Your tickets have been sent to:</p>
        <p className="text-sm">{email}</p>
        <Link
          href={paths.home.getHref()}
          className={`${buttonVariants({ variant: "outline", size: "xl" })} mt-12 w-[276px]`}
        >
          <SquareAltArrowLeftIcon size={22} aria-hidden="true" />
          Back to home
        </Link>
      </div>
    </div>
  );
}
