import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";

const apolloClient = new ApolloClient({
  link: new HttpLink({ uri: `${process.env.NEXT_PUBLIC_API_URL}/graphql` }),
  cache: new InMemoryCache(),
});

export default apolloClient;
