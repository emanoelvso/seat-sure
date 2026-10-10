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
          <h2 className="text-2xl leading-[1.2] font-medium text-white">
            ooops!!!
          </h2>
          <p className="text-xl leading-[1.2] text-neutral-100">
            You haven&apos;t booked any tickets yet. <br />
            Explore exciting events and secure your spot now!
          </p>
        </div>
        <Link
          href={paths.events.getHref()}
          className="inline-flex h-10 w-[182px] items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-4 py-[5px] text-base leading-[120%] text-white transition-colors hover:border-shade-100 hover:bg-shade-100"
        >
          Browse Events
          <ArrowRightIcon size={24} aria-hidden />
        </Link>
      </div>
    </div>
  );
}
