#!/usr/bin/env node

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

// Parse command line arguments
const args = process.argv.slice(2);
const environment = args[0] || process.env.NODE_ENV || 'dev';
const noPropagateFlag = args.includes('--no-propagate');

// Configuration
const CONFIG = {
  // CodeGachi Organization private env repository
  envRepoUrl: process.env.ENV_REPO_URL || 'git@github.com:CodeGachi/.env.git',
  envRepoDir: path.join(repoRoot, '.env-repo'),
  environment: environment, // 'dev' or 'prod'
  branch: environment === 'prod' ? 'main' : 'dev',
  targetEnvFile: path.join(repoRoot, `.env.${environment}`),
};

/**
 * Execute shell command and return output
 * Note: Masks sensitive URLs in error messages
 */
function exec(command, options = {}) {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options,
    });
  } catch (error) {
    // Mask sensitive information (tokens, passwords) in error messages
    const maskedCommand = command.replace(/(https?:\/\/)([^@]+@)/, '$1***@');
    console.error(`[ERROR] Command failed: ${maskedCommand}`);
    const maskedMessage = error.message.replace(/(https?:\/\/)([^@]+@)/, '$1***@');
    console.error(maskedMessage);
    throw error;
  }
}

/**
 * Check if directory exists
 */
function dirExists(dirPath) {
  return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
}

/**
 * Mask sensitive information in URLs (tokens, passwords)
 */
function maskUrl(url) {
  return url.replace(/(https?:\/\/)([^@]+@)/, '$1***@');
}

/**
 * Clone or update the env repository
 */
function syncEnvRepo() {
  console.log(`🔄 Syncing environment repository (branch: ${CONFIG.branch})...`);
  
  if (!dirExists(CONFIG.envRepoDir)) {
    console.log(`📥 Cloning env repository from: ${maskUrl(CONFIG.envRepoUrl)}`);
    exec(`git clone -b ${CONFIG.branch} ${CONFIG.envRepoUrl} ${CONFIG.envRepoDir} 2>&1 | grep -v "Cloning into" || true`);
  } else {
    console.log(`📥 Pulling latest changes from ${CONFIG.branch} branch...`);
    const currentDir = process.cwd();
    process.chdir(CONFIG.envRepoDir);
    exec('git fetch origin');
    exec(`git checkout ${CONFIG.branch}`);
    exec(`git reset --hard origin/${CONFIG.branch}`);
    process.chdir(currentDir);
  }
  
  console.log('✅ Environment repository synced successfully');
}

/**
 * Copy .env file from repo to project root
 * Private repo stores .env file, branch name determines dev/prod
 */
function copyEnvFile() {
  const sourceEnvFile = path.join(CONFIG.envRepoDir, '.env');
  
  if (!fs.existsSync(sourceEnvFile)) {
    console.error(`[ERROR] .env file not found in env repository: ${sourceEnvFile}`);
    console.error(`Please make sure .env file exists in the ${CONFIG.branch} branch of your env repository`);
    process.exit(1);
  }
  
  console.log(`📋 Copying .env from ${CONFIG.branch} branch to .env.${CONFIG.environment}...`);
  fs.copyFileSync(sourceEnvFile, CONFIG.targetEnvFile);
  console.log(`✅ .env.${CONFIG.environment} file copied to: ${CONFIG.targetEnvFile}`);
  
  // Copy to .env for Docker Compose (it always looks for .env)
  const dotEnvPath = path.join(repoRoot, '.env');
  fs.copyFileSync(sourceEnvFile, dotEnvPath);
  console.log(`✅ Copied to .env (Docker Compose compatibility)`);
}

/**
 * Run sync-envs.mjs to propagate env vars to backend
 */
function propagateEnvVars() {
  if (noPropagateFlag) {
    console.log('ℹ️  Skipping backend propagation (--no-propagate flag)');
    return;
  }
  
  console.log('🔄 Propagating environment variables to backend...');
  const syncEnvsScript = path.join(repoRoot, 'scripts', 'sync-envs.mjs');
  
  if (fs.existsSync(syncEnvsScript)) {
    // Use ENV_TARGET instead of NODE_ENV to avoid conflicts with build tools
    exec(`ENV_TARGET=${CONFIG.environment} node ${syncEnvsScript}`);
    console.log('✅ Environment variables propagated to backend');
  } else {
    console.warn('⚠️  sync-envs.mjs not found, skipping propagation');
  }
}

/**
 * Show current env file info
 */
function showEnvInfo() {
  console.log('\n📊 Environment file status:');
  console.log(`  🌍 Environment: ${CONFIG.environment}`);
  console.log(`  🌿 Branch: ${CONFIG.branch}`);
  
  if (fs.existsSync(CONFIG.targetEnvFile)) {
    const stats = fs.statSync(CONFIG.targetEnvFile);
    const lines = fs.readFileSync(CONFIG.targetEnvFile, 'utf8').split('\n');
    const envVarCount = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith('#');
    }).length;
    
    console.log(`  📍 Location: ${CONFIG.targetEnvFile}`);
    console.log(`  📅 Last modified: ${stats.mtime.toLocaleString()}`);
    console.log(`  🔢 Environment variables: ${envVarCount}`);
  } else {
    console.log(`  ⚠️  No .env.${CONFIG.environment} file found`);
  }
  
  console.log('');
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 SyncNapse Environment Sync Tool\n');
  
  console.log(`📌 Target environment: ${CONFIG.environment}`);
  console.log(`📌 Repository: ${maskUrl(CONFIG.envRepoUrl)}`);
  console.log(`📌 Branch: ${CONFIG.branch}\n`);
  
  try {
    // Step 1: Sync env repository
    syncEnvRepo();
    
    // Step 2: Copy .env file
    copyEnvFile();
    
    // Step 3: Propagate to backend
    propagateEnvVars();
    
    // Step 4: Show info
    showEnvInfo();
    
    console.log('✨ Environment sync completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Environment sync failed');
    console.error(error.message);
    process.exit(1);
  }
}

// Run main function
main();

