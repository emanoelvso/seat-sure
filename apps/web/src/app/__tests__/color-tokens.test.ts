import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.join(__dirname, "../globals.css"), "utf8");

function token(name: string): string {
  const match = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!match) throw new Error(`Missing token --color-${name}`);
  return match[1];
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const channel = parseInt(hex.slice(i, i + 2), 16) / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

const WCAG_AA = 4.5;

describe("shared colour tokens", () => {
  it("renders white button text on the primary fill at 4.5:1 or more", () => {
    expect(contrast("#ffffff", token("primary"))).toBeGreaterThanOrEqual(WCAG_AA);
  });

  it.each(["neutral-900", "neutral-800"])(
    "renders primary-coloured text on %s at 4.5:1 or more",
    (surface) => {
      expect(contrast(token("tint-500"), token(surface))).toBeGreaterThanOrEqual(
        WCAG_AA,
      );
    },
  );

  it("renders tint-400 link text on neutral-700 dialogs at 4.5:1 or more", () => {
    expect(contrast(token("tint-400"), token("neutral-700"))).toBeGreaterThanOrEqual(
      WCAG_AA,
    );
  });

  it.each(["neutral-700", "neutral-800"])(
    "renders success-400 text on %s at 4.5:1 or more",
    (surface) => {
      expect(contrast(token("success-400"), token(surface))).toBeGreaterThanOrEqual(
        WCAG_AA,
      );
    },
  );

  it("renders neutral-200 helper text on neutral-1000 at 4.5:1 or more", () => {
    expect(contrast(token("neutral-200"), token("neutral-1000"))).toBeGreaterThanOrEqual(
      WCAG_AA,
    );
  });

  it.each(["neutral-700", "neutral-800"])(
    "renders error-400 text on %s at 4.5:1 or more",
    (surface) => {
      expect(contrast(token("error-400"), token(surface))).toBeGreaterThanOrEqual(
        WCAG_AA,
      );
    },
  );

  it("renders pagination page numbers (neutral-200) on neutral-900 at 4.5:1 or more", () => {
    expect(contrast(token("neutral-200"), token("neutral-900"))).toBeGreaterThanOrEqual(
      WCAG_AA,
    );
  });
});
