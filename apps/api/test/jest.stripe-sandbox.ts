import config from './jest.shared.ts';

// Opt-in smoke test against Stripe's test mode (GW-46..GW-48). Not matched by
// jest.e2e.ts. It takes the key from the process environment only (no dotenv
// setup), so a key is never picked up by accident.
export default {
  ...config,
  setupFiles: [],
  testMatch: ['<rootDir>/src/**/__test__/sandbox/**/*.spec.ts'],
  testTimeout: 60_000,
};
