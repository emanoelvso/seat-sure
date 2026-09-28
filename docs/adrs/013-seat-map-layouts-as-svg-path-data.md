# ADR-013: Seat Map Layouts as SVG Path Data in a Fixed View Box

- **Date**: 2026-09-27
- **Status**: Accepted
- **Deciders**: emanoelvso
- **Tags**: architecture, database, frontend, seat-map, svg
- **Links**:
  - [ADR-011: Catalog Owns Ticket Types and Seat Maps](./011-catalog-owns-ticket-types-and-seat-maps.md)
  - Figma "buy ticket choose section-concert1" (file `Lzr6zdinjT686jQhOwpVmq`, node `5692:59632`)
  - Decision AD-003 in `.specs/STATE.md`

## Context

`SeatMap.layout` is a JSONB column. It was first typed as polygons, with `sections` wrongly declared as a single object, and `entities.mmd` described it as "sections polygons". The first real venue design, a concert arena, has a stage wedge and concentric ring sections made of arcs and cubic Bézier curves. It comes out of Figma as SVG paths. The web app must draw the map, make every section clickable and keyboard-accessible, and highlight the section linked to the selected ticket type. Polygons can only approximate curves by sampling many points.

## Decision

`SeatMap.layout` stores shapes as **SVG path data in absolute coordinates of a fixed view box**:

```ts
type SeatMapShape = { label: string; path: string; labelAt: [number, number] };
type SeatMapSection = SeatMapShape & { key: string; color: string };
type SeatMapLayout = {
  viewBox: { width: number; height: number };
  stage: SeatMapShape;
  sections: SeatMapSection[];
};
```

- **Source of paths**: design exports, translated into the view box.
- **Linking sections to prices**: `SeatMapSection.key` matches `TicketType.sectionKey`.
- **GraphQL**: the layout is exposed as typed objects (`path` strings, `labelX`/`labelY`).
- **Rendering**: the web `SeatMap` component draws each section as a focusable `<g role="button">` with `aria-pressed` and `aria-disabled`.

## Consequences

### Benefits

- Maps match the design exactly for any shape (rings, arcs, wedges), with a small payload (about 1 KB per section).
- One generic renderer serves every venue. New venues are data, not code.
- Path data is native to the browser, so no geometry library is needed on the client.

### Challenges

- The server can't easily compute geometry from path strings, such as which section contains a point, which rows are "front rows", or adjacency. Seat-level positions (`Seat.x/y`) will need their own coordinates.
- A malformed `path` renders nothing and isn't validated on write yet. That validation belongs to the admin flow that edits seat maps.
- Authoring needs tooling. The first map was translated from Figma with a one-off script.

### Trade-offs

- Polygons support simple server-side geometry, but curves become large, lossy point lists.
- A static SVG asset per venue is the quickest to ship, but sections can't be linked to ticket types or made interactive from data.
- A canvas or map library gives zoom and pan, but it adds a dependency and loses the free accessibility of DOM/SVG elements.
