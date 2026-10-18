import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fixture } from '../demo/fixture.mjs';
const image = 'seat-sure-release-api:local';
const docker = (...args) => execFileSync('docker',args,{encoding:'utf8',maxBuffer:10*1024*1024});
test('root image excludes local files and runs production health as nonroot', {timeout:1200000}, async () => {
  docker('build','-f','apps/api/Dockerfile','-t',image,'.');
  assert.equal(docker('image','inspect',image,'--format','{{.Config.User}}').trim(),'1001:1001');
  assert.equal(docker('run','--rm',image,'node','-e',`const fs=require('fs');const assert=require('assert/strict');assert.equal(process.getuid(),1001);for(const p of ['dist/main.js','demo/migrate.mjs','demo/seed.mjs','demo/reset.mjs','node_modules/@seat-sure/shared/dist/index.js'])assert.ok(fs.existsSync(p),p);for(const p of ['src','test','.git','.specs','.env','node_modules/typescript','node_modules/jest'])assert.ok(!fs.existsSync(p),p);console.log('runtime-ok')`).trim(),'runtime-ok');
  const fixturePath = `apps/api/container/context-fixture-${process.pid}`;
  try {
    for (const name of ['secrets', '.secrets', 'credentials', '.credentials']) {
      mkdirSync(`${fixturePath}/${name}`,{recursive:true});
      writeFileSync(`${fixturePath}/${name}/synthetic.txt`,'synthetic context exclusion fixture');
    }
  docker('build','-f','apps/api/Dockerfile','--target','context-check','-t','seat-sure-release-context:local','.');
  } finally { rmSync(fixturePath,{recursive:true,force:true}); }
  const context = docker('create','seat-sure-release-context:local','unused').trim();
  try {
    const archive = execFileSync('docker',['export',context],{maxBuffer:50*1024*1024});
    const paths = execFileSync('tar',['-tf','-'],{input:archive,encoding:'utf8'}).split('\n');
    assert.ok(paths.includes('context/pnpm-lock.yaml'));
    assert.ok(!paths.some(p=>/(^|\/)(\.env[^/]*|credentials(?:\.[^/]*)?|\.credentials|secrets|\.secrets|\.git|\.specs|\.agents|\.claude|\.codex|\.cursor|\.windsurf|\.figwright|node_modules|\.next|\.data|AGENTS\.md|CLAUDE\.md|skills-lock\.json)(\/|$)/.test(p)));
  } finally { docker('rm',context); }
  const db = await fixture(); let container;
  await db.client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');
  try {
    const env = { ...db.env, DATABASE_URL:db.env.DATABASE_URL.replace('127.0.0.1','seat-sure-db'), NODE_ENV:'production', PORT:'3001', AUTH_CODE_SENDER:'disabled', JWT_SECRET:randomBytes(32).toString('hex'), BILLING_FINGERPRINT_SECRET:randomBytes(32).toString('hex'), REDIS_HOST:'unused',REDIS_PORT:'6379' };
    // Values are generated disposable fixtures and never printed by the test.
    const args = Object.entries(env).flatMap(([k,v])=>['-e',`${k}=${v}`]);
    const network = Object.keys(JSON.parse(docker('inspect','seat-sure-db','--format','{{json .NetworkSettings.Networks}}')))[0];
    container = docker('run','-d','--network',network,'-p','127.0.0.1::3001',...args,image,'node','demo/start.mjs').trim();
    const port = docker('port',container,'3001').trim().split(':').at(-1);
    let response;
    for(let i=0;i<60;i++) { try { response=await fetch(`http://127.0.0.1:${port}/health`);if(response.ok)break; } catch {} await new Promise(resolve=>setTimeout(resolve,500)); }
    assert.equal(response?.status,200);assert.deepEqual(await response.json(),{status:'ok'});
  } finally { if(container)docker('rm','-f',container);await db.close(); }
});
