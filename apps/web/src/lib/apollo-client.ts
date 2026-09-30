import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";
import { env } from "@/config/env";

export const apolloClient = new ApolloClient({
  link: new HttpLink({ uri: () => `${env.apiUrl}/graphql` }),
  cache: new InMemoryCache(),
});
