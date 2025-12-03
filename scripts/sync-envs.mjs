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
  // Filter out undefined, null, and empty values
  const lines = Object.entries(kv)
    .filter(([k, v]) => v !== undefined && v !== null && v !== '' && v !== 'undefined')
    .map(([k, v]) => `${k}=${v}`);
  fs.writeFileSync(targetPath, lines.join('\n'));
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

// Determine environment (dev by default)
// Use ENV_TARGET to avoid conflicts with NODE_ENV used by build tools
const environment = process.env.ENV_TARGET || process.env.NODE_ENV || 'dev';
let rootEnvPath = path.join(repoRoot, `.env.${environment}`);
let rootEnv = readDotenv(rootEnvPath);

// Fallback to .env if .env.{environment} doesn't exist
if (Object.keys(rootEnv).length === 0) {
  rootEnvPath = path.join(repoRoot, '.env');
  rootEnv = readDotenv(rootEnvPath);
}

if (Object.keys(rootEnv).length === 0) {
  console.error(`[env] No .env file found at: ${rootEnvPath}`);
  process.exit(1);
}

console.log(`[env] Using environment file: ${rootEnvPath}`);

// Backend environment variables
const backendEnvPath = path.join(repoRoot, 'backend', '.env');

// Read existing backend .env if exists
const existingBackendEnv = readDotenv(backendEnvPath);

// Start with rootEnv (propagate everything by default for backend)
// Then override/map specific keys
const backendEnv = {
  ...existingBackendEnv, // Preserve existing backend-specific values
  ...rootEnv, // Propagate all root values (overwrite backend ones with root truth)
  
  // Explicit mappings (if keys differ)
  STORAGE_LOCAL_PATH: rootEnv.STORAGE_LOCAL_PATH || './var/storage',
  
  // MinIO Configuration mapping (if not already in rootEnv)
  MINIO_ENDPOINT: rootEnv.STORAGE_ENDPOINT,
  MINIO_PUBLIC_URL: rootEnv.MINIO_SERVER_URL,
  MINIO_REGION: rootEnv.STORAGE_REGION,
  MINIO_BUCKET: rootEnv.STORAGE_BUCKET,
  MINIO_ACCESS_KEY: rootEnv.STORAGE_ACCESS_KEY_ID || rootEnv.MINIO_ROOT_USER,
  MINIO_SECRET_KEY: rootEnv.STORAGE_SECRET_ACCESS_KEY || rootEnv.MINIO_ROOT_PASSWORD,
};

fs.mkdirSync(path.dirname(backendEnvPath), { recursive: true });
writeEnvFile(backendEnvPath, backendEnv);

console.log(`[env] backend/.env updated (Merged: Root .env + Existing Backend .env)`);

// Frontend environment variables
const frontendEnvPath = path.join(repoRoot, 'frontend', '.env');
const frontendEnv = {
  NODE_ENV: rootEnv.FRONTEND_NODE_ENV || rootEnv.NODE_ENV,
  // Use backend API instead of IndexedDB
  NEXT_PUBLIC_USE_LOCAL_DB: rootEnv.NEXT_PUBLIC_USE_LOCAL_DB,
  NEXT_PUBLIC_API_URL: rootEnv.NEXT_PUBLIC_API_URL,
  // Real-time Transcription Settings (Web Speech API)
  NEXT_PUBLIC_SPEECH_LANGUAGE: rootEnv.NEXT_PUBLIC_SPEECH_LANGUAGE,
  // Real-time Collaboration (Liveblocks)
  NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY: rootEnv.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY,
};

fs.mkdirSync(path.dirname(frontendEnvPath), { recursive: true });
writeEnvFile(frontendEnvPath, frontendEnv);

console.log(`[env] frontend/.env generated from root .env.${environment} (${rootEnvPath})`);
