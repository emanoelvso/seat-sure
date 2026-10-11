// A GraphQL call over fetch. Returns the parsed body ({ data, errors }) and
// the HTTP status.
export const graphql = async (baseUrl, query, variables, token) => {
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  return { status: response.status, ...(await response.json()) };
};
