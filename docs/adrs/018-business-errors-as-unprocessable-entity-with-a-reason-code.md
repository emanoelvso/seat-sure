# ADR-018: Business Errors as Unprocessable Entity with a Reason Code

- **Date**: 2026-10-02
- **Status**: Accepted
- **Deciders**: emanoelvso
- **Tags**: api, graphql, error-handling, backend, frontend
- **Links**:
  - [ADR-014: Not-Found as Null Results in GraphQL Lookup Queries](./014-not-found-as-null-results-in-graphql-queries.md)
  - [ADR-005: NestJS as Backend Framework](./005-nestjs-as-backend-framework.md)

## Context

ADR-014 covers lookups: a missing record is `null`, and GraphQL `errors` mean a failure. Login and signup are the first mutations, and they fail in ways the user must see and act on: email already taken, wrong password, account locked, code incorrect or expired, a field too long. The web needs a stable value to tell these apart and to show the right message under the right field. Nest's Apollo driver turns a thrown `HttpException` into a GraphQL error. It maps 400, 401, 403 and 422 to the codes `BAD_REQUEST`, `UNAUTHENTICATED`, `FORBIDDEN` and `BAD_USER_INPUT`, maps every other status to `INTERNAL_SERVER_ERROR`, and copies the exception's response body into `extensions.originalError`.

## Decision

- A business rule a user can trip throws a domain exception that extends `UnprocessableEntityException` (422) with the response body `{ statusCode, reason, message, fields? }`. Clients receive `extensions.code: "BAD_USER_INPUT"` and read `extensions.originalError.reason`, an `UPPER_SNAKE` code owned by the module (`EMAIL_TAKEN`, `LOGIN_LOCKED`, `CODE_EXPIRED`, ...). `fields` maps input field names to messages.
- Missing, invalid or revoked credentials throw `UnauthorizedException` (→ `UNAUTHENTICATED`).
- Anything else is a server failure and keeps its default handling.
- On the web, `graphqlServerFetch` throws a `GraphQLRequestError { message, code, reason, fields }`. Features map `reason` to their own copy, so API message wording never reaches the UI by accident.

## Consequences

### Benefits

- No global `formatError` change; the Apollo driver already carries everything.
- One convention for every future mutation (seat holds, checkout, reviews).
- Reasons are stable identifiers, so API messages can change without breaking the web.

### Challenges

- Clients depend on `extensions.originalError`, a detail of the Nest Apollo driver. A driver change could move it.
- Reason codes are strings duplicated between the API and the web. A shared enum in `@seat-sure/shared` would remove that duplication later.

### Trade-offs

- Union result types (`SignUpResult = SignUpSuccess | EmailTaken | ...`) would put errors in the schema and in generated types, but every mutation would need a union and every client a `__typename` switch. Errors stay out of the schema here.
- A custom `formatError` writing `reason` straight into `extensions.code` would read more cleanly, but it changes every module's error output at once.
