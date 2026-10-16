import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { demoOptions, runCli } from './database.mjs';

export function command(args, env) {
  return new Promise((resolve,reject) => {
    const child = spawn(process.execPath,args,{ cwd:fileURLToPath(new URL('..',import.meta.url)),env,stdio:'inherit' });
    const forward = (signal) => child.kill(signal);
    const term = () => forward('SIGTERM'); const interrupt = () => forward('SIGINT');
    process.once('SIGTERM',term); process.once('SIGINT',interrupt);
    const cleanup = () => { process.removeListener('SIGTERM',term); process.removeListener('SIGINT',interrupt); };
    child.once('error', error => { cleanup(); reject(error); });
    child.once('exit',(code) => { cleanup(); if (code === 0) resolve(); else reject(Object.assign(new Error('Startup command failed.'),{exitCode:code || 1})); });
  });
}
export async function start(env = process.env, run = (script) => command([script],env)) {
  demoOptions(env);
  for (const script of ['demo/migrate.mjs','demo/seed.mjs','dist/main.js']) await run(script);
}
runCli(import.meta.url, () => start().catch(error => { process.exitCode = error.exitCode || 1; throw error; }));
