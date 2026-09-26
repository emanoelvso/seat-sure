export type ShareResult = "shared" | "copied" | "cancelled" | "failed";

interface ShareData {
  title: string;
  url: string;
}

interface ShareNavigator {
  share?: (data: ShareData) => Promise<void>;
  clipboard?: { writeText: (text: string) => Promise<void> };
}

export async function shareLink(
  data: ShareData,
  nav: ShareNavigator = navigator,
): Promise<ShareResult> {
  if (nav.share) {
    try {
      await nav.share(data);
      return "shared";
    } catch (error) {
      if ((error as Error).name === "AbortError") return "cancelled";
    }
  }

  if (!nav.clipboard) return "failed";

  try {
    await nav.clipboard.writeText(data.url);
    return "copied";
  } catch {
    return "failed";
  }
}
