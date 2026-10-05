// Derives the 1-2 letter avatar fallback (AUTH-43): both names → their
// initials; one name → its initial; neither → the email's first letter.
export function getInitials(
  firstName: string,
  lastName: string,
  email: string,
): string {
  const first = firstName.trim();
  const last = lastName.trim();

  const initials = `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  if (initials) return initials;

  return email.trim().charAt(0).toUpperCase();
}
