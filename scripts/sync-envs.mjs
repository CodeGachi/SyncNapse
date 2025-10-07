import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function readDotenv(dotenvPath) {
  if (!fs.existsSync(dotenvPath)) return {};
  const lines = fs.readFileSync(dotenvPath, 'utf8').split(/\r?\n/);
  const result = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    result[key] = value;
  }
  return result;
}

function writeEnvFile(targetPath, kv) {
  const lines = Object.entries(kv).map(([k, v]) => `${k}=${v}`);
  fs.writeFileSync(targetPath, lines.join('\n'));
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const rootEnvPath = path.join(repoRoot, '.env');
const rootEnv = readDotenv(rootEnvPath);

if (Object.keys(rootEnv).length === 0) {
  console.error(`[env] root .env not found or empty at: ${rootEnvPath}`);
  process.exit(1);
}

const backendEnvPath = path.join(repoRoot, 'backend', '.env');
const backendEnv = {
  NODE_ENV: rootEnv.NODE_ENV ?? 'development',
  PORT: rootEnv.PORT ?? '4000',
  DEBUG_LEVEL: rootEnv.DEBUG_LEVEL ?? 'info',
  DATABASE_URL: rootEnv.DATABASE_URL ?? 'postgresql://postgres:change_me@localhost:5432/syncnapse?schema=public',
  JWT_SECRET: rootEnv.JWT_SECRET ?? 'change_me_dev',
};

fs.mkdirSync(path.dirname(backendEnvPath), { recursive: true });
writeEnvFile(backendEnvPath, backendEnv);

console.log(`[env] backend/.env generated from root .env (${rootEnvPath})`);
