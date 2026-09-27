import { config } from 'dotenv';
import fs from 'fs';

const testEnvFile = '.env.test';
const envFile = '.env';

if (!fs.existsSync(testEnvFile)) {
  throw new Error('.env.test file not found');
}

config({ path: envFile, quiet: true });
config({ path: testEnvFile, override: true, quiet: true });
