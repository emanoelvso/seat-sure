import { createParser } from "nuqs/server";

// SPEC_DEVIATION: the design uses nuqs's parseAsInteger for integer params.
// Reason: it parses with parseInt, so "1.5" reads as 1, and MIG-45 / MIG-50
// treat a value that isn't an integer as unset.
export const parseAsStrictInteger = createParser({
  parse: (value) => (/^-?\d+$/.test(value) ? Number(value) : null),
  serialize: (value: number) => String(value),
});
