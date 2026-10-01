interface CarouselProps<T> {
  row1: T[];
  row2: T[];
  // `loopCopy` is true for the copies that only fill the loop.
  renderItem: (item: T, index: number, loopCopy: boolean) => React.ReactNode;
}

function CarouselRow<T>({
  items,
  direction,
  renderItem,
}: {
  items: T[];
  direction: "left" | "right";
  renderItem: CarouselProps<T>["renderItem"];
}) {
  return (
    <div className="overflow-hidden w-full">
      <div
        className={`flex w-max ${
          direction === "left" ? "animate-scroll-left" : "animate-scroll-right"
        }`}
      >
        {/* Copies 2-4 only fill the loop, so assistive tech reaches each item
            once. They fill most of the visible row, so they stay clickable
            (no `inert`); renderItem takes their links out of the tab order. */}
        {[0, 1, 2, 3].map((setIndex) => (
          <div
            key={setIndex}
            className="flex gap-4 pr-4"
            aria-hidden={setIndex > 0 || undefined}
          >
            {items.map((item, i) => renderItem(item, i, setIndex > 0))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Carousel<T>({
  row1,
  row2,
  renderItem,
}: CarouselProps<T>) {
  return (
    <div className="flex flex-col gap-4 w-full overflow-hidden">
      <CarouselRow items={row1} direction="left" renderItem={renderItem} />
      <CarouselRow items={row2} direction="right" renderItem={renderItem} />
    </div>
  );
}
