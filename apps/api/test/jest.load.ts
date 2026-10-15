// The load helpers are native ESM (.mjs) because they also run as plain Node
// scripts. Run this config with NODE_OPTIONS=--experimental-vm-modules.
export default {
  rootDir: '..',
  testEnvironment: 'node',
  moduleFileExtensions: ['mjs', 'js', 'json'],
  transform: {},
  testMatch: ['<rootDir>/load/__test__/**/*.spec.mjs'],
  testTimeout: 60000,
  verbose: true,
};
