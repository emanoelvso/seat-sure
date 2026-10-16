import { parse, print } from "graphql";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GraphQLRequestError,
  graphqlServerFetch,
} from "@/lib/graphql-server";

vi.mock("server-only", () => ({}));
const incomingHeaders = vi.hoisted(() => vi.fn());
vi.mock("next/headers", () => ({ headers: incomingHeaders }));

const FIND_ARTIST = parse(`
  query FindArtist($input: FindArtistBySlugInput!) {
    findArtistBySlug(input: $input) {
      artist {
        name
      }
    }
  }
`);

interface FindArtistData {
  findArtistBySlug: { artist: { name: string } | null };
}

interface FindArtistVariables {
  input: { slug: string };
}

const variables: FindArtistVariables = { input: { slug: "adele" } };

function stubFetch(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function requestInit(fetchMock: ReturnType<typeof stubFetch>) {
  return fetchMock.mock.calls[0][1] as RequestInit;
}

const fetchArtist = (options?: Parameters<typeof graphqlServerFetch>[2]) =>
  graphqlServerFetch<FindArtistData, FindArtistVariables>(
    FIND_ARTIST,
    variables,
    options,
  );

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.seatsure.test:4000");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("graphqlServerFetch", () => {
  it("POSTs the printed document and variables as JSON to {apiUrl}/graphql", async () => {
    const fetchMock = stubFetch(jsonResponse({ data: {} }));

    await fetchArtist();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "http://api.seatsure.test:4000/graphql",
    );
    const init = requestInit(fetchMock);
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(init.body as string)).toEqual({
      query: print(FIND_ARTIST),
      variables: { input: { slug: "adele" } },
    });
  });

  it("revalidates every 60 seconds by default", async () => {
    const fetchMock = stubFetch(jsonResponse({ data: {} }));

    await fetchArtist();

    expect(requestInit(fetchMock).next).toEqual({
      revalidate: 60,
      tags: undefined,
    });
  });

  it("passes the given revalidate and tags through to the fetch cache", async () => {
    const fetchMock = stubFetch(jsonResponse({ data: {} }));

    await fetchArtist({ revalidate: 300, tags: ["artist:adele"] });

    expect(requestInit(fetchMock).next).toEqual({
      revalidate: 300,
      tags: ["artist:adele"],
    });
  });

  it("returns the response data", async () => {
    stubFetch(
      jsonResponse({
        data: { findArtistBySlug: { artist: { name: "Adele" } } },
      }),
    );

    await expect(fetchArtist()).resolves.toEqual({
      findArtistBySlug: { artist: { name: "Adele" } },
    });
  });

  it.each([200, 400])(
    "throws the first GraphQL error message (HTTP %i)",
    async (status) => {
      stubFetch(
        jsonResponse(
          {
            data: null,
            errors: [
              { message: "Artist lookup failed" },
              { message: "Second error" },
            ],
          },
          status,
        ),
      );

      await expect(fetchArtist()).rejects.toThrow("Artist lookup failed");
    },
  );

  it("throws with the status code on a non-2xx response without errors", async () => {
    stubFetch(jsonResponse({ data: null }, 500));

    await expect(fetchArtist()).rejects.toThrow(/500/);
  });

  it("throws with the status code on a non-2xx response that isn't JSON", async () => {
    stubFetch(new Response("<html>Bad Gateway</html>", { status: 502 }));

    await expect(fetchArtist()).rejects.toThrow(/502/);
  });

  it("sends no Authorization header when no accessToken is given", async () => {
    const fetchMock = stubFetch(jsonResponse({ data: {} }));

    await fetchArtist();

    expect(requestInit(fetchMock).headers).toEqual({
      "Content-Type": "application/json",
    });
  });

  it("sends the Bearer token when an accessToken is given", async () => {
    const fetchMock = stubFetch(jsonResponse({ data: {} }));

    await fetchArtist({ accessToken: "access-token-123" });

    expect(requestInit(fetchMock).headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer access-token-123",
    });
  });

  it("throws a GraphQLRequestError with the reason, message and fields from a BAD_USER_INPUT error", async () => {
    stubFetch(
      jsonResponse({
        data: null,
        errors: [
          {
            message: "Email is already taken",
            extensions: {
              code: "BAD_USER_INPUT",
              originalError: {
                reason: "EMAIL_TAKEN",
                message: "Email is already taken",
                fields: { email: "Email is already taken" },
              },
            },
          },
        ],
      }),
    );

    const error = (await fetchArtist().catch(
      (caught: unknown) => caught,
    )) as GraphQLRequestError;

    expect(error).toBeInstanceOf(GraphQLRequestError);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("Email is already taken");
    expect(error.code).toBe("BAD_USER_INPUT");
    expect(error.reason).toBe("EMAIL_TAKEN");
    expect(error.fields).toEqual({ email: "Email is already taken" });
  });

  it("throws a GraphQLRequestError with the code and no reason for an UNAUTHENTICATED error", async () => {
    stubFetch(
      jsonResponse({
        data: null,
        errors: [
          {
            message: "Unauthorized",
            extensions: { code: "UNAUTHENTICATED" },
          },
        ],
      }),
    );

    const error = (await fetchArtist().catch(
      (caught: unknown) => caught,
    )) as GraphQLRequestError;

    expect(error).toBeInstanceOf(GraphQLRequestError);
    expect(error.message).toBe("Unauthorized");
    expect(error.code).toBe("UNAUTHENTICATED");
    expect(error.reason).toBeUndefined();
    expect(error.fields).toBeUndefined();
  });
});

describe("visitor address forwarding", () => {
  const SECRET = "s".repeat(32);
  const visitor = (values: Record<string, string>) =>
    incomingHeaders.mockResolvedValue(new Headers(values));
  const sentHeaders = async (
    options: Parameters<typeof graphqlServerFetch>[2],
  ) => {
    const fetchMock = stubFetch(jsonResponse({ data: {} }));
    await fetchArtist(options);
    return requestInit(fetchMock).headers;
  };

  beforeEach(() => {
    incomingHeaders.mockReset();
  });

  it("sends the visitor address and the secret on uncached calls", async () => {
    vi.stubEnv("CLIENT_ADDRESS_SECRET", SECRET);
    visitor({ "x-real-ip": "198.51.100.7", "x-forwarded-for": "203.0.113.9" });

    expect(await sentHeaders({ revalidate: 0 })).toEqual({
      "Content-Type": "application/json",
      "X-Seat-Sure-Client-Ip": "198.51.100.7",
      "X-Seat-Sure-Client-Secret": SECRET,
    });
  });

  it("uses the first x-forwarded-for entry when x-real-ip is absent", async () => {
    vi.stubEnv("CLIENT_ADDRESS_SECRET", SECRET);
    visitor({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" });

    const sent = (await sentHeaders({ revalidate: 0 })) as Record<
      string,
      string
    >;
    expect(sent["X-Seat-Sure-Client-Ip"]).toBe("203.0.113.9");
  });

  it("does not send the address on cached calls, so the cache is not split per visitor", async () => {
    vi.stubEnv("CLIENT_ADDRESS_SECRET", SECRET);
    visitor({ "x-real-ip": "198.51.100.7" });

    expect(await sentHeaders({ revalidate: 60 })).toEqual({
      "Content-Type": "application/json",
    });
    expect(incomingHeaders).not.toHaveBeenCalled();
  });

  it("sends nothing without a configured secret", async () => {
    vi.stubEnv("CLIENT_ADDRESS_SECRET", undefined);
    visitor({ "x-real-ip": "198.51.100.7" });

    expect(await sentHeaders({ revalidate: 0 })).toEqual({
      "Content-Type": "application/json",
    });
  });

  it("sends nothing when the visitor address is unknown or there is no request scope", async () => {
    vi.stubEnv("CLIENT_ADDRESS_SECRET", SECRET);
    visitor({});
    expect(await sentHeaders({ revalidate: 0 })).toEqual({
      "Content-Type": "application/json",
    });
    incomingHeaders.mockRejectedValue(new Error("outside a request scope"));
    expect(await sentHeaders({ revalidate: 0 })).toEqual({
      "Content-Type": "application/json",
    });
  });
});
