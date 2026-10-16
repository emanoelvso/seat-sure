import "server-only";
import type { TypedDocumentNode } from "@apollo/client";
import { headers } from "next/headers";
import { print } from "graphql";
import { env } from "@/config/env";

interface CacheOptions {
  revalidate?: number | false;
  tags?: string[];
  accessToken?: string;
}

interface GraphQLErrorShape {
  message: string;
  extensions?: {
    code?: string;
    originalError?: {
      reason?: string;
      message?: string;
      fields?: Record<string, string>;
    };
  };
}

interface GraphQLResponse<TData> {
  data?: TData;
  errors?: GraphQLErrorShape[];
}

// Carries the GraphQL error's classification (extensions.code) and, for
// business errors (BAD_USER_INPUT), the reason code and field errors from
// extensions.originalError, so callers can branch without parsing messages.
export class GraphQLRequestError extends Error {
  readonly code?: string;
  readonly reason?: string;
  readonly fields?: Record<string, string>;

  constructor(
    message: string,
    code?: string,
    reason?: string,
    fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "GraphQLRequestError";
    this.code = code;
    this.reason = reason;
    this.fields = fields;
  }
}

// The API rate limits demo mutations per visitor. Every server-side call arrives
// from this server, so the visitor's address travels in a header the API trusts
// only together with the shared secret. Cached calls never carry it, so the page
// cache is not split per visitor.
async function clientAddressHeaders(): Promise<Record<string, string>> {
  const secret = env.clientAddressSecret;
  if (!secret) return {};
  try {
    const incoming = await headers();
    const address =
      incoming.get("x-real-ip") ??
      incoming.get("x-forwarded-for")?.split(",")[0]?.trim();
    return address
      ? {
          "X-Seat-Sure-Client-Ip": address,
          "X-Seat-Sure-Client-Secret": secret,
        }
      : {};
  } catch {
    // No request scope, for example while prerendering.
    return {};
  }
}

export async function graphqlServerFetch<TData, TVariables>(
  document: TypedDocumentNode<TData, TVariables>,
  variables: TVariables,
  { revalidate = 60, tags, accessToken }: CacheOptions = {},
): Promise<TData> {
  const response = await fetch(`${env.apiUrl}/graphql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(revalidate === 0 ? await clientAddressHeaders() : {}),
    },
    body: JSON.stringify({ query: print(document), variables }),
    next: { revalidate, tags },
  });

  // A proxy can answer a failed request with a body that isn't JSON.
  const body: GraphQLResponse<TData> = await response
    .json()
    .catch(() => ({}));

  if (body.errors?.length) {
    const [error] = body.errors;
    throw new GraphQLRequestError(
      error.message,
      error.extensions?.code,
      error.extensions?.originalError?.reason,
      error.extensions?.originalError?.fields,
    );
  }
  if (!response.ok) {
    throw new Error(`GraphQL request failed with status ${response.status}`);
  }
  return body.data as TData;
}
