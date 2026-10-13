// Load test configuration. Local, non-production targets only.
export const ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'host.docker.internal'];

const DEFAULT_BASE_URL = 'http://localhost:3000/graphql';
const DEFAULT_DATABASE_URL =
  'postgresql://postgres:postgres@localhost:5432/seat-sure-load';

const assertAllowedHost = (name, value) => {
  let hostname;
  try {
    hostname = new URL(value).hostname;
  } catch {
    throw new Error(`${name} is not a valid URL: ${value}`);
  }
  if (!ALLOWED_HOSTS.includes(hostname)) {
    throw new Error(
      `${name} host "${hostname}" is not allowed. Load tests run against ${ALLOWED_HOSTS.join(', ')} only.`,
    );
  }
};

export const loadConfig = (env = process.env) => {
  const baseUrl = env.BASE_URL || DEFAULT_BASE_URL;
  const databaseUrl = env.LOAD_DATABASE_URL || DEFAULT_DATABASE_URL;

  assertAllowedHost('BASE_URL', baseUrl);
  assertAllowedHost('LOAD_DATABASE_URL', databaseUrl);

  return { baseUrl, databaseUrl };
};
