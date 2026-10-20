import { describe, expect, it } from "vitest";
import { stripeMode } from "@/components/stripe/stripe-mode";

describe("stripeMode", () => {
  it("is off when the publishable key is unset (GW-45)", () => {
    expect(stripeMode(undefined)).toBe("off");
    expect(stripeMode("")).toBe("off");
  });

  it("is test for a pk_test_ key (GW-41)", () => {
    expect(stripeMode("pk_test_abc123")).toBe("test");
  });

  it("is invalid for a live key (GW-42)", () => {
    expect(stripeMode("pk_live_abc123")).toBe("invalid");
  });

  it("is invalid for anything else that is set (GW-42)", () => {
    expect(stripeMode("sk_test_abc123")).toBe("invalid");
    expect(stripeMode("nonsense")).toBe("invalid");
  });
});
