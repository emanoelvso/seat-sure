import { afterEach, describe, expect, it, vi } from "vitest";
import { env } from "@/config/env";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("env.timeZone", () => {
  it("defaults to UTC when NEXT_PUBLIC_TIME_ZONE is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_TIME_ZONE", undefined);

    expect(env.timeZone).toBe("UTC");
  });

  it("returns NEXT_PUBLIC_TIME_ZONE when it is set", () => {
    vi.stubEnv("NEXT_PUBLIC_TIME_ZONE", "America/Sao_Paulo");

    expect(env.timeZone).toBe("America/Sao_Paulo");
  });
});

describe("env.apiUrl", () => {
  it("returns NEXT_PUBLIC_API_URL when it is set", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.seatsure.test:4000");

    expect(env.apiUrl).toBe("http://api.seatsure.test:4000");
  });

  it("throws when NEXT_PUBLIC_API_URL is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", undefined);

    expect(() => env.apiUrl).toThrow("Missing NEXT_PUBLIC_API_URL");
  });
});

describe("env.clientAddressSecret", () => {
  it("is undefined when CLIENT_ADDRESS_SECRET is unset or empty", () => {
    vi.stubEnv("CLIENT_ADDRESS_SECRET", undefined);
    expect(env.clientAddressSecret).toBeUndefined();
    vi.stubEnv("CLIENT_ADDRESS_SECRET", "");
    expect(env.clientAddressSecret).toBeUndefined();
  });

  it("returns CLIENT_ADDRESS_SECRET when it is set", () => {
    vi.stubEnv("CLIENT_ADDRESS_SECRET", "s".repeat(32));
    expect(env.clientAddressSecret).toBe("s".repeat(32));
  });
});

describe("config/env module", () => {
  it("imports without throwing when no variable is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", undefined);
    vi.stubEnv("NEXT_PUBLIC_TIME_ZONE", undefined);
    vi.resetModules();

    await expect(import("@/config/env")).resolves.toHaveProperty("env");
  });
});
