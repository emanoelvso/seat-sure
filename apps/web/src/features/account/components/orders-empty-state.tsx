import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "@solar-icons/react/outline";
import { paths } from "@/config/paths";

// Full empty state of the ticket list (ORDEMPTY-01 AC 1), from Figma
// 5011:121662 inside the empty-state card 5819:38819. The basket is the
// frame's raster image fill (512x512 PNG), shown at 250px.
export function OrdersEmptyState() {
  return (
    <div className="flex w-[480px] flex-col items-center gap-6">
      <Image src="/account/orders-empty.png" alt="" width={250} height={250} />
      <div className="flex w-full flex-col items-center gap-8">
        <div className="flex w-full flex-col items-center gap-6 text-center">
          <h2 className="text-2xl font-medium text-white">ooops!!!</h2>
          <p className="text-xl text-neutral-100">
            You haven&apos;t booked any tickets yet. <br />
            Explore exciting events and secure your spot now!
          </p>
        </div>
        {/* SPEC_DEVIATION: Figma's primary "Fill" button is white on
            #C14FE6 (primary), 3.8:1, below WCAG AA for 16px text.
            Reason: tint-600, the button's own pressed shade, gives 5.4:1. */}
        <Link
          href={paths.events.getHref()}
          className="inline-flex h-10 w-[182px] items-center justify-center gap-2 rounded-lg border border-tint-600 bg-tint-600 px-4 py-[5px] text-base leading-[120%] text-white transition-colors hover:border-shade-100 hover:bg-shade-100"
        >
          Browse Events
          <ArrowRightIcon size={24} aria-hidden />
        </Link>
      </div>
    </div>
  );
}
