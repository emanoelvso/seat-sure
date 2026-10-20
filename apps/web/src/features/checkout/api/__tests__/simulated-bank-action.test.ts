import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { simulatedBankAction } from "@/features/checkout/api/simulated-bank-action";

vi.mock("@/config/env", () => ({
  env: { apiUrl: "http://api.test" },
}));

const fetchMock = vi.fn<typeof fetch>();

describe("simulatedBankAction", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each(["approve", "fail"] as const)(
    "posts the %s outcome to the API's simulated bank and reports ok (GW-20, GW-25)",
    async (outcome) => {
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

      const result = await simulatedBankAction("sim_secret_abc", outcome);

      expect(result).toEqual({ ok: true });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("http://api.test/billing/simulated-3ds/sim_secret_abc");
      expect(init?.method).toBe("POST");
      expect(JSON.parse(String(init?.body))).toEqual({ outcome });
    },
  );

  it("encodes the client secret in the path", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await simulatedBankAction("a/b c", "approve");

    expect(fetchMock.mock.calls[0][0]).toBe(
      "http://api.test/billing/simulated-3ds/a%2Fb%20c",
    );
  });

  it.each([400, 404, 500])(
    "reads a %s answer as GENERIC",
    async (status) => {
      fetchMock.mockResolvedValueOnce(new Response(null, { status }));

      const result = await simulatedBankAction("sim_secret_abc", "approve");

      expect(result).toEqual({ reason: "GENERIC" });
    },
  );

  it("reads a failed request as GENERIC", async () => {
    fetchMock.mockRejectedValueOnce(new Error("connection refused"));

    const result = await simulatedBankAction("sim_secret_abc", "fail");

    expect(result).toEqual({ reason: "GENERIC" });
  });
});
