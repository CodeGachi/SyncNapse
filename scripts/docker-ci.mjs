#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Debug: print effective parameters to help diagnose env issues (no hardcoding)
let debugLog;
function initDebugLog() {
  // Initialize debugLog after loadDotenvIntoProcessEnv is defined
  debugLog = function(message, extra = {}) {
    const ts = new Date().toISOString();
    // English comments and logs only
    console.debug(`[docker-ci][${ts}] ${message}`, extra);
  };
}

function exitWith(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}

const [,, task, target, ...restArgs] = process.argv;
if (!task || !['lint', 'test', 'build'].includes(task)) {
  exitWith('Usage: node scripts/docker-ci.mjs <lint|test|build> <frontend|backend|all> [-- extra docker args]');
}
if (!target || !['frontend', 'backend', 'all'].includes(target)) {
  exitWith('Target must be one of: frontend | backend | all');
}

// Load .env file from repo root if present (host-side), but do not override existing envs
function loadDotenvIntoProcessEnv() {
  try {
    // Determine environment file based on ENV_TARGET (defaults to dev)
    // Use ENV_TARGET to avoid conflicts with build tools that expect NODE_ENV=production
    const environment = process.env.ENV_TARGET || process.env.NODE_ENV || 'dev';
    const envFileName = environment === 'production' || environment === 'prod' ? '.env.prod' : '.env.dev';
    const envPath = resolve(process.cwd(), envFileName);
    
    if (!existsSync(envPath)) {
      console.warn(`[docker-ci] ${envFileName} not found, using process env only`);
      return;
    }
    
    const raw = readFileSync(envPath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      if (!line || line.trim().startsWith('#')) continue;
      const idx = line.indexOf('=');
      if (idx <= 0) continue;
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim();
      if (!(key in process.env)) {
        process.env[key] = val;
      }
    }
    debugLog(`Loaded environment from ${envFileName}`, { environment });
  } catch (e) {
    console.warn('[docker-ci] failed to read env file:', (e && e.message) || 'unknown');
  }
}

initDebugLog();
loadDotenvIntoProcessEnv();

const env = process.env;
const nodeVersion = env.NODE_VERSION;

debugLog('Resolved environment', { nodeVersion, task, target });

if (!nodeVersion) exitWith('NODE_VERSION is required (set in .env or export)');

function run(cmd, args) {
  debugLog('Executing', { cmd, args });
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', env: process.env });
    child.on('exit', (code) => {
      if (code === 0) resolve(); else reject(new Error(`${cmd} exited with code ${code}`));
    });
    child.on('error', reject);
  });
}

// Map tasks to docker compose services (in docker-compose.tools.yml)
const toolsFile = 'docker-compose.tools.yml';
const servicesByTask = {
  lint: {
    frontend: 'frontend-lint',
    backend: 'backend-lint',
  },
  test: {
    frontend: 'frontend-test',
    backend: 'backend-test',
  },
};

async function main() {
  if (task === 'build') {
    // Build uses the main docker-compose.yml to ensure parity with CI images
    const compose = ['compose', '-f', 'docker-compose.yml', 'build'];
    if (target === 'all') {
      await run('docker', [...compose, 'frontend']);
      await run('docker', [...compose, 'backend']);
    } else {
      await run('docker', [...compose, target]);
    }
    return;
  }

  const mapping = servicesByTask[task];
  if (!mapping) exitWith('Unsupported task');

  const selected = target === 'all' ? Object.values(mapping) : [mapping[target]];
  
  // Determine env file for docker compose
  // Use ENV_TARGET to avoid conflicts with build tools that expect NODE_ENV=production
  const environment = process.env.ENV_TARGET || process.env.NODE_ENV || 'dev';
  const envFile = environment === 'production' || environment === 'prod' ? '.env.prod' : '.env.dev';
  
  for (const service of selected) {
    const args = ['compose', '--env-file', envFile, '-f', toolsFile, 'run', '--rm', service, ...restArgs];
    await run('docker', args);
  }
}

main().catch((err) => {
  console.error('[docker-ci] failed:', err?.message || String(err));
  process.exit(1);
});

