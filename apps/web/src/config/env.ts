// The only module that reads process.env. Each NEXT_PUBLIC_* variable is read
// as a literal so Next.js can inline it in client bundles. Getters defer the
// read, so importing this module never throws when a variable is unset.
export const env = {
  get apiUrl(): string {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) throw new Error("Missing NEXT_PUBLIC_API_URL");
    return apiUrl;
  },
  get timeZone(): string {
    return process.env.NEXT_PUBLIC_TIME_ZONE ?? "UTC";
  },
};
