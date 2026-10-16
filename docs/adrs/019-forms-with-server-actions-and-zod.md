# ADR-019: Forms with Server Actions and Zod

- **Date**: 2026-10-02
- **Status**: Accepted
- **Deciders**: emanoelvso
- **Tags**: frontend, nextjs, forms, validation
- **Links**:
  - [ADR-004: Frontend Technology Stack](./004-frontend-technology-stack.md)
  - [ADR-008: Bulletproof React Feature-Based Frontend Architecture](./008-bulletproof-react-feature-based-frontend-architecture.md)
  - [ADR-016: Sessions as JWT Access Tokens and Rotating Refresh Tokens in httpOnly Cookies](./016-sessions-as-jwt-access-and-rotating-refresh-tokens-in-httponly-cookies.md)
  - [ADR-018: Business Errors as Unprocessable Entity with a Reason Code](./018-business-errors-as-unprocessable-entity-with-a-reason-code.md)

## Context

Login and signup are the first real forms in `apps/web`. The web architecture guidelines left "Form state" open, noting that Bulletproof React recommends React Hook Form with Zod. These forms are small (two to four fields), validate on submit, and must write `httpOnly` cookies after the API answers (ADR-016). In Next.js, cookies can only be written in Server Functions and Route Handlers.

## Decision

- Forms submit to **Server Actions** (`"use server"`) declared in `features/<name>/api/{operation}-action.ts`. Client form components use React 19's `useActionState`.
- Each action validates `FormData` with a **zod** schema from `features/<name>/utils/`, then calls the API through `graphqlServerFetch` with `revalidate: 0`, maps `GraphQLRequestError.reason` (ADR-018) to field or form errors, writes cookies, and `redirect()`s on success.
- An action returns a serializable state `{ fieldErrors, formError, values }`. The form shows each message under its field and refills the fields it sent back (never passwords).
- No React Hook Form until a form needs per-keystroke validation or field arrays.

## Consequences

### Benefits

- One round trip validates, calls the API and sets cookies. Tokens never pass through client code.
- Forms work before hydration (progressive enhancement).
- No new form library. Zod is the only addition, already used by the API's config.

### Challenges

- The rules exist twice: in the web's zod schemas and in the API's domain rules. Tests on both sides assert the same messages, and a shared schema package can remove the copy later.
- Validation runs on submit only. Inline feedback while typing needs extra client code.

### Trade-offs

- React Hook Form would give per-field validation while typing and less re-rendering on large forms, but it still needs a Server Action or Route Handler to write cookies, so it would add a library without removing the server step.
