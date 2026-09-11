# ADR-003: Single Events Table with JSONB Metadata for Type-Specific Data

- **Date**: 2026-09-10
- **Status**: Accepted
- **Deciders**: emanoelvso
- **Tags**: architecture, database, schema, postgresql

## Context

The platform supports four event types: concerts, shows, sports, and festivals. All share a common set of fields (name, date, venue, price, image, status), but each type has distinct metadata — sports events have home/away teams and leagues, festivals have multi-day lineups and stages, concerts have artists and tour names. Three schema patterns were considered: (1) a separate table per event type, (2) a single wide table with nullable type-specific columns, and (3) a single base table with a JSONB column for type-specific data.

## Decision

We will use a **single `events` table** with a `type` enum column (`concert`, `show`, `sport`, `festival`) and a `metadata` JSONB column for type-specific fields:

```sql
CREATE TYPE event_type AS ENUM ('concert', 'show', 'sport', 'festival');

CREATE TABLE events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        event_type NOT NULL,
  name        VARCHAR NOT NULL,
  date        TIMESTAMPTZ NOT NULL,
  venue_id    UUID REFERENCES venues(id),
  price_from  NUMERIC(10,2),
  image_url   TEXT,
  status      VARCHAR DEFAULT 'active',
  metadata    JSONB,
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

Type-specific fields are stored in `metadata` as structured JSON (e.g., `{ "artist": "Adele", "tour": "30 Tour" }` for concerts, `{ "home_team": "Lakers", "away_team": "Bulls", "league": "NBA" }` for sports). PostgreSQL JSONB supports indexing and querying on nested fields when needed.

## Consequences

### Benefits

- "All upcoming events" queries are a single `SELECT` with no `UNION` across tables
- No nullable columns for type-specific data — common fields are always present, type-specific fields are in the opaque `metadata` blob
- Adding a new event type (e.g., `conference`) requires no schema migration — only a new enum value and a new `metadata` shape
- PostgreSQL JSONB is indexable (`CREATE INDEX ON events USING GIN (metadata)`), so filtering by metadata fields (e.g., `metadata->>'league' = 'NBA'`) is performant at scale

### Challenges

- Type-specific field validation (required fields per event type) must be enforced at the application or GraphQL schema layer, not at the database level
- JSONB queries are less readable than column-based queries and can surprise developers unfamiliar with the pattern
- Renaming a metadata field across existing rows requires a data migration script rather than a simple `ALTER TABLE`

### Trade-offs

- Separate tables per type would give each event type full column-level type safety and constraints, but would make cross-type queries painful (UNION or polymorphic joins) and add schema migration overhead for every new type
- A single wide table with nullable columns avoids JSONB but produces a sparse table where most rows have null in most type-specific columns, making the schema harder to reason about as the number of types grows
