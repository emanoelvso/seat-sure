import {
  DollarMinimalisticIcon,
  ShieldCheckIcon,
} from "@solar-icons/react/outline";

// PAY-20: static reassurance box shown on every checkout page.
export function FanProtectCard() {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-neutral-500 p-4 text-sm text-neutral-200">
      <p className="flex items-center gap-2 font-bold text-white">
        <ShieldCheckIcon
          size={20}
          aria-hidden="true"
          className="shrink-0 text-tint-500"
        />
        FanProtect : every order is 100% guaranteed
      </p>
      <div className="flex items-center gap-2">
        <DollarMinimalisticIcon
          size={20}
          aria-hidden="true"
          className="shrink-0 text-tint-500"
        />
        <div>
          <p className="font-bold text-white">Easy Refund</p>
          <p>
            Change of plans? Get your money back up to 24 hours before the
            event.
          </p>
        </div>
      </div>
    </div>
  );
}
