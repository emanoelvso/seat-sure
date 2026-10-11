import { gql } from "@apollo/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { apolloClient } from "@/lib/apollo-client";

const PING = gql`
  query Ping {
    ping
  }
`;

function stubFetch() {
  const fetchMock = vi.fn().mockImplementation(
    async () =>
      new Response(JSON.stringify({ data: { ping: "pong" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const runQuery = () =>
  apolloClient.query({ query: PING, fetchPolicy: "no-cache" });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("apolloClient (TEST-05)", () => {
  it("posts to {NEXT_PUBLIC_API_URL}/graphql", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.test");
    const fetchMock = stubFetch();

    await runQuery();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.example.test/graphql");
  });

  it("follows a NEXT_PUBLIC_API_URL change between two queries", async () => {
    const fetchMock = stubFetch();

    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.test");
    await runQuery();
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://other.example.test");
    await runQuery();

    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      "https://api.example.test/graphql",
      "https://other.example.test/graphql",
    ]);
  });

  it("rejects with Missing NEXT_PUBLIC_API_URL when unset, without failing on import", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", undefined);
    const fetchMock = stubFetch();

    // Fresh import with the variable unset: loading the module must not throw.
    vi.resetModules();
    const { apolloClient: freshClient } = await import("@/lib/apollo-client");

    await expect(
      freshClient.query({ query: PING, fetchPolicy: "no-cache" }),
    ).rejects.toThrow("Missing NEXT_PUBLIC_API_URL");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
