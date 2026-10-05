// Guards the `redirectTo` query param used after signing in: only an
// internal, single-leading-slash path is safe to redirect to. Anything else
// (absolute URLs, protocol-relative `//`, backslash tricks, `javascript:`,
// or a bare path with no leading slash) falls back to the home page.
export function safeRedirect(value: string | undefined | null): string {
  if (!value) return "/";
  if (!value.startsWith("/")) return "/";
  if (value.startsWith("//")) return "/";
  if (value.startsWith("/\\")) return "/";
  return value;
}
