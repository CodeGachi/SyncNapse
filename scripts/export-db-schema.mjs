#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function log(msg, extra) {
  const payload = extra ? { msg, ...extra } : { msg };
  // Debug logs with dynamic values only
  console.debug('[export-db-schema]', JSON.stringify(payload));
}

try {
  const repoRoot = process.cwd();
  const backendDir = path.join(repoRoot, 'backend');
  const schemaPath = path.join(backendDir, 'prisma', 'schema.prisma');
  const outDir = path.join(repoRoot, 'db', 'init');
  const outFile = path.join(outDir, '001_schema.sql');

  if (!fs.existsSync(schemaPath)) {
    console.error(`[export-db-schema] schema not found: ${schemaPath}`);
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });

  // Validate schema first
  log('running prisma validate', { backendDir });
  const validate = spawnSync('npx', ['prisma', 'validate'], { cwd: backendDir, encoding: 'utf8', shell: true });
  if (validate.status !== 0) {
    console.error('[export-db-schema] prisma validate failed');
    if (validate.stdout) console.error(validate.stdout);
    if (validate.stderr) console.error(validate.stderr);
    process.exit(validate.status || 1);
  }

  function runDiff(args, label) {
    log('running prisma migrate diff', { label, args });
    const r = spawnSync('npx', ['prisma', 'migrate', 'diff', ...args], { cwd: backendDir, encoding: 'utf8', shell: true });
    return r;
  }

  // Try with relative path first
  let result = runDiff(['--from-empty', '--to-schema-datamodel', 'prisma/schema.prisma', '--script'], 'relative');
  let script = (result.stdout || '').trim();

  // Fallback: absolute schema path
  if (result.status === 0 && script.length < 100) {
    const absSchema = schemaPath;
    result = runDiff(['--from-empty', '--to-schema-datamodel', absSchema, '--script'], 'absolute');
    script = (result.stdout || '').trim();
  }

  if (result.status !== 0 || script.length === 0) {
    console.error('[export-db-schema] migrate diff produced no output');
    if (result.stdout) console.error(result.stdout);
    if (result.stderr) console.error(result.stderr);
    process.exit(result.status || 1);
  }
  const hasCitext = /CREATE\s+EXTENSION\s+IF\s+NOT\s+EXISTS\s+citext/i.test(script) || /EXTENSION.*citext/i.test(script);
  if (!hasCitext) {
    log('prepend citext extension');
    script = `CREATE EXTENSION IF NOT EXISTS citext;\n\n${script}`;
  }

  fs.writeFileSync(outFile, script, 'utf8');
  log('schema sql written', { outFile, bytes: script.length });
  console.log('[export-db-schema] done');
} catch (err) {
  console.error('[export-db-schema] error', { message: err?.message });
  process.exit(1);
}
