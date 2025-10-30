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
  NODE_ENV: rootEnv.NODE_ENV,
  PORT: rootEnv.PORT,
  DEBUG_LEVEL: rootEnv.DEBUG_LEVEL,
  DATABASE_URL: rootEnv.DATABASE_URL,
  // OAuth Configuration
  GOOGLE_CLIENT_ID: rootEnv.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: rootEnv.GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL: rootEnv.GOOGLE_CALLBACK_URL,
  // JWT Configuration
  JWT_SECRET: rootEnv.JWT_SECRET,
  JWT_ACCESS_EXPIRATION: rootEnv.JWT_ACCESS_EXPIRATION,
  JWT_REFRESH_EXPIRATION: rootEnv.JWT_REFRESH_EXPIRATION,
  // Storage Configuration
  STORAGE_PROVIDER: rootEnv.STORAGE_PROVIDER,
  STORAGE_BUCKET: rootEnv.STORAGE_BUCKET,
  STORAGE_REGION: rootEnv.STORAGE_REGION,
  STORAGE_ENDPOINT: rootEnv.STORAGE_ENDPOINT,
  STORAGE_ACCESS_KEY_ID: rootEnv.STORAGE_ACCESS_KEY_ID,
  STORAGE_SECRET_ACCESS_KEY: rootEnv.STORAGE_SECRET_ACCESS_KEY,
  STORAGE_LOCAL_PATH: rootEnv.STORAGE_LOCAL_PATH,
  // Cache & Performance
  CACHE_TTL: rootEnv.CACHE_TTL,
  // Rate Limiting
  ENABLE_RATE_LIMITING: rootEnv.ENABLE_RATE_LIMITING,
  RATE_LIMIT_MAX: rootEnv.RATE_LIMIT_MAX,
  RATE_LIMIT_TTL: rootEnv.RATE_LIMIT_TTL,
};

fs.mkdirSync(path.dirname(backendEnvPath), { recursive: true });
writeEnvFile(backendEnvPath, backendEnv);

console.log(`[env] backend/.env generated from root .env (${rootEnvPath})`);
