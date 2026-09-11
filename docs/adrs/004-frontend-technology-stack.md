# ADR-004: Frontend Technology Stack

- **Date**: 2026-09-10
- **Status**: Accepted
- **Deciders**: emanoelvso
- **Tags**: architecture, frontend, nextjs, tailwind, radix-ui, storybook
- **Links**: [ADR-001: GraphQL as Primary API](./001-graphql-primary-api-with-rest-for-specialized-endpoints.md)

## Context

Seat Sure is a public-facing ticketing platform that requires fast page loads, accessible UI components, and a maintainable component system for a complex interface (event carousels, seat maps, checkout flows). The project also serves as a portfolio piece, so technology choices should reflect current industry standards and demonstrate awareness of modern frontend patterns. The stack must support Server Components and ISR (required by the caching strategy defined in ADR-001), strong TypeScript integration, and a scalable approach to component styling as the UI grows.

## Decision

We will use the following frontend stack:

- **Next.js 16 (App Router)** — React framework with Server Components and built-in ISR support
- **React 19** — UI library; concurrent features and use of `use()` hook for data fetching in Server Components
- **Tailwind CSS v4** — utility-first CSS framework for styling
- **Class Variance Authority (CVA) 0.7.1** — type-safe component variant management
- **Radix UI 1.6** — unstyled, accessible component primitives
- **Storybook 10 (with Vitest + Playwright + a11y addon)** — component development, documentation, and accessibility testing

### Why each technology

**Next.js App Router** was chosen over Vite + React Router or Remix because it has the deepest integration with React Server Components and provides ISR (`next: { revalidate }`) natively, which is the caching strategy decided in ADR-001. The App Router's file-based routing and layout system also matches the page structure of a ticketing platform (nested layouts for event detail, checkout steps).

**Tailwind CSS v4** was chosen over CSS Modules or styled-components because utility classes co-located with JSX eliminate the context-switching between stylesheet and component files. At scale, Tailwind enforces a shared design token vocabulary across the team. Version 4 introduces a new CSS-first configuration model (no `tailwind.config.js`) that reduces boilerplate.

**CVA** was chosen to manage multi-variant components (buttons with `size`, `variant`, `intent` combinations) without runtime overhead. It generates static class strings and integrates with Tailwind's IntelliSense, producing type-safe component APIs that are difficult to call incorrectly.

**Radix UI** was chosen over building custom accessible components from scratch or using a fully styled library (e.g., shadcn, MUI). Radix provides correct keyboard navigation, ARIA attributes, and focus management for complex interactions (modals, dropdowns, accordions) while remaining entirely unstyled — allowing full visual control via Tailwind. This avoids fighting a pre-styled library's specificity.

**Storybook** was chosen as the component development environment because it enables building and testing components in isolation before integrating them into pages. The `addon-a11y` plugin surfaces accessibility violations during development. The `addon-vitest` integration allows component unit tests to run inside Storybook's browser environment via Playwright, keeping tests close to the rendered output.

## Consequences

### Benefits

- Next.js App Router + React Server Components reduce client-side JavaScript by moving data fetching and rendering to the server, improving Core Web Vitals scores
- Tailwind + CVA produces a styling system that is both flexible and constrained — designers and engineers share the same vocabulary of tokens, and invalid variant combinations are caught at compile time
- Radix UI eliminates the most difficult part of frontend development (accessible interactive components) while preserving visual freedom
- Storybook with a11y and Playwright creates a feedback loop where accessibility issues are caught before they reach production
- The stack is widely adopted in 2025–2026, meaning strong ecosystem tooling (IDE plugins, ESLint rules, Chromatic integration) and recognizability by engineering interviewers

### Challenges

- Next.js 16 and React 19 contain breaking changes from prior versions; the App Router paradigm (Server vs Client Components, the `use()` hook) requires understanding the client/server boundary, which has a learning curve
- Tailwind v4's CSS-first configuration is a departure from v3; existing tooling assumptions (PostCSS plugin path, `@tailwind` directives) changed and must be configured correctly
- Storybook adds a separate build pipeline and configuration surface (`storybook/main.ts`, `preview.ts`) that must be kept in sync with the Next.js app configuration

### Trade-offs

- A fully styled component library (e.g., shadcn/ui, MUI) would reduce initial development time but would trade visual flexibility and portfolio differentiation for speed; the Radix + Tailwind + CVA combination takes more upfront work but produces a system that is fully owned
- CSS Modules would provide stronger style encapsulation than Tailwind but require switching between `.module.css` files and component files, and offer no built-in design token system
- A single-page application (Vite + React Router) would simplify the build configuration but lose server-side rendering and ISR, making the caching strategy in ADR-001 impossible to implement as designed
