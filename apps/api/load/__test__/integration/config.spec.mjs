import { loadConfig } from '../../lib/config.mjs';

describe('loadConfig', () => {
  it('defaults BASE_URL to the local GraphQL endpoint', () => {
    expect(loadConfig({}).baseUrl).toBe('http://localhost:3000/graphql');
  });

  it('accepts localhost, 127.0.0.1 and host.docker.internal', () => {
    for (const host of ['localhost', '127.0.0.1', 'host.docker.internal']) {
      const url = `http://${host}:3000/graphql`;
      expect(loadConfig({ BASE_URL: url }).baseUrl).toBe(url);
    }
  });

  it('rejects any other host and names the allowed hosts', () => {
    for (const host of ['localhost', '127.0.0.1', 'host.docker.internal']) {
      expect(() =>
        loadConfig({ BASE_URL: 'http://example.com/graphql' }),
      ).toThrow(host);
    }
  });

  it('rejects a host that only contains an allowed name', () => {
    expect(() =>
      loadConfig({ BASE_URL: 'http://localhost.evil.com/graphql' }),
    ).toThrow(/not allowed/);
  });

  it('rejects a non-local database host', () => {
    expect(() =>
      loadConfig({ LOAD_DATABASE_URL: 'postgresql://u:p@db.example.com/x' }),
    ).toThrow(/not allowed/);
  });

  it('rejects a value that is not a URL', () => {
    expect(() => loadConfig({ BASE_URL: 'not a url' })).toThrow(
      /not a valid URL/,
    );
  });
});
