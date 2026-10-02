// The seat glyph exported from Figma (figma/available.svg, select.svg and
// unavailable.svg): one 28×24 path, filled per seat state with theme tokens.
export const SEAT_GLYPH_WIDTH = 28;
export const SEAT_GLYPH_HEIGHT = 24;

export type SeatState = "available" | "unavailable" | "picked";

const seatFill: Record<SeatState, string> = {
  available: "fill-white",
  unavailable: "fill-neutral-300",
  picked: "fill-primary",
};

export function SeatGlyph({ state }: { state: SeatState }) {
  return (
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M23.4839 1.34631C25.471 2.91463 24.5948 6.90088 22.5806 8.11459C21.2646 8.90747 20.7742 10.1464 20.7742 12.6802V16.1583H14H7.22581V13.2439C7.22581 11.4359 6.77419 9.18802 4.96774 8.11459C2.93729 6.34151 3.16129 1.78196 4.74194 1.0518C7.22581 -0.396282 21.6774 -0.396282 23.4839 1.34631ZM4.96774 13.8014L5.41935 17.9628H14.4516H22.5806L22.7558 13.8014C22.9726 10.541 23.4008 9.57222 24.7303 9.32826C27.2603 8.86386 27.9711 10.6875 27.9864 17.6831L28 24H14H0V17.1751C0 10.0279 0.00873828 8.97822 2.70968 9.18797C4.51613 9.32826 4.66787 11.2023 4.96774 13.8014Z"
      className={seatFill[state]}
    />
  );
}
