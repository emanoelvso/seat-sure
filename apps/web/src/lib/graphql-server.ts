import "server-only";
import type { TypedDocumentNode } from "@apollo/client";
import { print } from "graphql";
import { env } from "@/config/env";

interface CacheOptions {
  revalidate?: number | false;
  tags?: string[];
}

interface GraphQLResponse<TData> {
  data?: TData;
  errors?: { message: string }[];
}

export async function graphqlServerFetch<TData, TVariables>(
  document: TypedDocumentNode<TData, TVariables>,
  variables: TVariables,
  { revalidate = 60, tags }: CacheOptions = {},
): Promise<TData> {
  const response = await fetch(`${env.apiUrl}/graphql`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: print(document), variables }),
    next: { revalidate, tags },
  });

  // A proxy can answer a failed request with a body that isn't JSON.
  const body: GraphQLResponse<TData> = await response
    .json()
    .catch(() => ({}));

  if (body.errors?.length) throw new Error(body.errors[0].message);
  if (!response.ok) {
    throw new Error(`GraphQL request failed with status ${response.status}`);
  }
  return body.data as TData;
}
