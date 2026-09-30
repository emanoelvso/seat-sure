"use client";

import { apolloClient } from "@/lib/apollo-client";
import { ApolloProvider } from "@apollo/client/react";
import { NuqsAdapter } from "nuqs/adapters/next/app";

export function AppProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NuqsAdapter>
      <ApolloProvider client={apolloClient}>{children}</ApolloProvider>
    </NuqsAdapter>
  );
}
