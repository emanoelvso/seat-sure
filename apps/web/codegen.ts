import type { CodegenConfig } from "@graphql-codegen/cli";

// Types for the GraphQL operations in src/features/*/api/, generated from the
// schema the API writes on boot (apps/api/schema.gql).
//
// SPEC_DEVIATION: the design generates one file with the `typescript` and
// `typescript-operations` plugins.
// Reason: from v6, typescript-operations emits the input and enum types it
// uses, which collide with the `typescript` plugin's in one file, and v5
// doesn't support graphql 17. So the operations go to graphql.ts and the
// schema types that src/types/api.ts needs (`Event`) go to schema.ts.
const config: CodegenConfig = {
  overwrite: true,
  schema: "../api/schema.gql",
  documents: ["src/features/*/api/*.ts"],
  config: {
    // `null` for nullable fields; nullable input fields stay optional.
    avoidOptionals: { field: true, inputValue: false },
    defaultScalarType: "unknown",
    scalars: { DateTime: "string" },
    enumsAsTypes: true,
    // Apollo Client adds `__typename` to every object but the root.
    nonOptionalTypename: true,
    skipTypeNameForRoot: true,
  },
  generates: {
    "src/types/__generated__/graphql.ts": {
      plugins: ["typescript-operations"],
    },
    "src/types/__generated__/schema.ts": {
      plugins: ["typescript"],
    },
  },
};

export default config;
