interface CarouselProps<T> {
  row1: T[];
  row2: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
}

function CarouselRow<T>({
  items,
  direction,
  renderItem,
}: {
  items: T[];
  direction: "left" | "right";
  renderItem: (item: T, index: number) => React.ReactNode;
}) {
  return (
    <div className="overflow-hidden w-full">
      <div
        className={`flex w-max ${
          direction === "left" ? "animate-scroll-left" : "animate-scroll-right"
        }`}
      >
        {/* Copies 2-4 only fill the loop, so assistive tech and the keyboard
            reach each item once. */}
        {[0, 1, 2, 3].map((setIndex) => (
          <div
            key={setIndex}
            className="flex gap-4 pr-4"
            aria-hidden={setIndex > 0 || undefined}
            inert={setIndex > 0}
          >
            {items.map((item, i) => renderItem(item, i))}
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
