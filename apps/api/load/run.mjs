import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './lib/config.mjs';
import { preflight } from './lib/preflight.mjs';
import { findApiPid, startSampler } from './lib/sampler.mjs';
import { seedEvent } from './lib/seed.mjs';
import { createBuyerSessions } from './lib/users.mjs';
import { checkOversell } from './verify/oversell.mjs';

// Runs one scenario end to end: preflight, fresh event and buyers, the k6
// image with the resource sampler beside it, then the oversell check.
// Usage: node load/run.mjs <contention|spike>

const SCENARIOS = { contention: { buyers: 200 }, spike: { buyers: 2000 } };
const PASS_THROUGH = [
  'VUS',
  'RAMP_SECONDS',
  'HOLD_SECONDS',
  'HOLD_P95_MS',
  'PAY_P95_MS',
  'DISCOVERY_P95_MS',
];

const [name] = process.argv.slice(2);
if (!SCENARIOS[name]) {
  console.error('Usage: node load/run.mjs <contention|spike>');
  process.exit(2);
}

const log = (message) => console.log(`[load] ${message}`);
const loadDir = fileURLToPath(new URL('./', import.meta.url));

let config;
try {
  config = loadConfig();
  await preflight(config.baseUrl);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const buyers =
  name === 'spike' && process.env.VUS
    ? Number(process.env.VUS)
    : SCENARIOS[name].buyers;
const runDir = `${loadDir}results/${name}-${new Date().toISOString().replace(/[:.]/g, '-')}`;
mkdirSync(runDir, { recursive: true });

log(`seeding a fresh event and ${buyers} buyers`);
const event = await seedEvent({ databaseUrl: config.databaseUrl });
const sessions = await createBuyerSessions({
  baseUrl: config.baseUrl,
  databaseUrl: config.databaseUrl,
  count: buyers,
});

// The k6 container reaches the host API through host.docker.internal.
const containerUrl = new URL(config.baseUrl);
containerUrl.hostname = 'host.docker.internal';
writeFileSync(
  `${runDir}/fixture.json`,
  JSON.stringify({ baseUrl: containerUrl.toString(), ...event, sessions }),
);

let sampler = null;
try {
  sampler = await startSampler({
    databaseUrl: config.databaseUrl,
    outFile: `${runDir}/resources.jsonl`,
    apiPid: await findApiPid(config.baseUrl),
  });
} catch (error) {
  console.warn(`[load] resource sampler not started: ${error.message}`);
}

log(`running ${name} in ${runDir}`);
const env = PASS_THROUGH.filter((key) => process.env[key]).flatMap((key) => [
  '-e',
  `${key}=${process.env[key]}`,
]);
const k6Status = await new Promise((resolve) => {
  spawn(
    'docker',
    [
      'run',
      '--rm',
      '--add-host=host.docker.internal:host-gateway',
      '-v',
      `${runDir}:/run`,
      '-v',
      `${loadDir}scenarios:/scripts:ro`,
      ...env,
      'grafana/k6',
      'run',
      '--summary-export=/run/summary.json',
      `/scripts/${name}.js`,
    ],
    { stdio: 'inherit' },
  ).on('exit', (code) => resolve(code ?? 1));
});

await sampler?.stop();

const oversell = await checkOversell({
  databaseUrl: config.databaseUrl,
  eventId: event.eventId,
});
writeFileSync(`${runDir}/oversell.json`, JSON.stringify(oversell, null, 2));
log(
  `oversell check: ${oversell.ok ? 'ok' : 'FAILED'} ${JSON.stringify(oversell)}`,
);
log(`k6 exit code ${k6Status}, results in ${runDir}`);

process.exit(k6Status !== 0 || !oversell.ok ? 1 : 0);
