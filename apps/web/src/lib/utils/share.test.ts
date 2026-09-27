import { describe, expect, it, vi } from "vitest";
import { shareLink } from "./share";

const data = {
  title: "Adele - The O2 Arena",
  url: "https://seatsure.test/artists/adele",
};

const namedError = (name: string) =>
  Object.assign(new Error(name), { name });

describe("shareLink", () => {
  it("opens the native share sheet with the title and url", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn();

    const result = await shareLink(data, { share, clipboard: { writeText } });

    expect(result).toBe("shared");
    expect(share).toHaveBeenCalledWith({
      title: "Adele - The O2 Arena",
      url: "https://seatsure.test/artists/adele",
    });
    expect(writeText).not.toHaveBeenCalled();
  });

  it("reports a dismissed share sheet as cancelled without copying", async () => {
    const share = vi.fn().mockRejectedValue(namedError("AbortError"));
    const writeText = vi.fn();

    const result = await shareLink(data, { share, clipboard: { writeText } });

    expect(result).toBe("cancelled");
    expect(writeText).not.toHaveBeenCalled();
  });

  it("falls back to copying when the share sheet fails", async () => {
    const share = vi.fn().mockRejectedValue(namedError("NotAllowedError"));
    const writeText = vi.fn().mockResolvedValue(undefined);

    const result = await shareLink(data, { share, clipboard: { writeText } });

    expect(result).toBe("copied");
    expect(writeText).toHaveBeenCalledWith(
      "https://seatsure.test/artists/adele",
    );
  });

  it("copies the url when native share is unavailable", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);

    const result = await shareLink(data, { clipboard: { writeText } });

    expect(result).toBe("copied");
    expect(writeText).toHaveBeenCalledWith(
      "https://seatsure.test/artists/adele",
    );
  });

  it("reports a failed clipboard write", async () => {
    const writeText = vi.fn().mockRejectedValue(namedError("NotAllowedError"));

    expect(await shareLink(data, { clipboard: { writeText } })).toBe("failed");
  });

  it("reports failure when neither share nor clipboard exist", async () => {
    expect(await shareLink(data, {})).toBe("failed");
  });
});
