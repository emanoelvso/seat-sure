// Shared by both simulator card-entry forms, independent of demo sign-in mode.
export function DemoPaymentNotice() {
  return (
    <aside
      role="note"
      aria-label="Demo payment instructions"
      className="flex flex-col gap-2 rounded-xl border border-neutral-500 bg-neutral-900 p-4 text-sm text-neutral-100"
    >
      <p className="font-semibold text-white">
        Demo only. Do not enter real card details.
      </p>
      <p>Success: <code>4242 4242 4242 4242</code></p>
      <p>Decline: <code>4000 0000 0000 0002</code></p>
      <p>Saved-card payment decline: <code>4000 0000 0000 0341</code></p>
      <p>Use any future expiry (MM/YY) and a 3-digit CVV such as 123.</p>
      <p>
        Demo data resets daily. Your temporary session, orders and saved cards
        may disappear.
      </p>
    </aside>
  );
}
