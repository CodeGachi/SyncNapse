#!/usr/bin/env node

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

// Parse command line arguments
const args = process.argv.slice(2);
const environment = args[0] || process.env.NODE_ENV || 'dev';
const commitMessage = args.slice(1).join(' ') || 'Update environment variables';

// Configuration
const CONFIG = {
  // CodeGachi Organization private env repository
  envRepoUrl: process.env.ENV_REPO_URL || 'git@github.com:CodeGachi/.env.git',
  envRepoDir: path.join(repoRoot, '.env-repo'),
  environment: environment, // 'dev' or 'prod'
  branch: environment === 'prod' ? 'main' : 'dev',
  sourceEnvFile: path.join(repoRoot, `.env.${environment}`),
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
      cwd: options.cwd || process.cwd(),
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
function ensureEnvRepo() {
  console.log(`🔄 Ensuring environment repository (branch: ${CONFIG.branch})...`);
  
  if (!dirExists(CONFIG.envRepoDir)) {
    console.log(`📥 Cloning env repository from: ${maskUrl(CONFIG.envRepoUrl)}`);
    exec(`git clone -b ${CONFIG.branch} ${CONFIG.envRepoUrl} ${CONFIG.envRepoDir} 2>&1 | grep -v "Cloning into" || true`);
  } else {
    console.log(`📥 Pulling latest changes from ${CONFIG.branch} branch...`);
    exec('git fetch origin', { cwd: CONFIG.envRepoDir });
    exec(`git checkout ${CONFIG.branch}`, { cwd: CONFIG.envRepoDir });
    exec(`git pull origin ${CONFIG.branch}`, { cwd: CONFIG.envRepoDir });
  }
  
  console.log('✅ Environment repository ready');
}

/**
 * Copy local .env file to env repository
 * Private repo stores .env file, branch name determines dev/prod
 */
function copyEnvToRepo() {
  if (!fs.existsSync(CONFIG.sourceEnvFile)) {
    console.error(`[ERROR] Source .env.${CONFIG.environment} file not found: ${CONFIG.sourceEnvFile}`);
    console.error('Please make sure you have the environment file locally');
    process.exit(1);
  }
  
  const targetEnvFile = path.join(CONFIG.envRepoDir, '.env');
  
  console.log(`📋 Copying .env.${CONFIG.environment} to ${CONFIG.branch} branch as .env...`);
  fs.copyFileSync(CONFIG.sourceEnvFile, targetEnvFile);
  console.log(`✅ .env file copied to repository`);
}

/**
 * Check if there are changes to commit
 */
function hasChanges() {
  const status = exec('git status --porcelain', { cwd: CONFIG.envRepoDir, silent: true });
  return status.trim().length > 0;
}

/**
 * Mask sensitive values in environment variables
 * Shows only key names, not values
 */
function maskEnvLine(line) {
  // Skip empty lines and comments
  if (!line || line.trim().startsWith('#')) {
    return line;
  }
  
  // For KEY=VALUE lines, show KEY=*** (masking the value)
  const eqIndex = line.indexOf('=');
  if (eqIndex > 0) {
    const key = line.slice(0, eqIndex);
    return `${key}=***`;
  }
  
  return line;
}

/**
 * Show diff of changes (with sensitive values masked)
 */
function showDiff() {
  console.log('\n📊 Changes to be committed:');
  console.log('━'.repeat(50));
  
  try {
    // Try to get git diff
    const diff = exec(`git diff HEAD .env`, { cwd: CONFIG.envRepoDir, silent: true });
    
    // Parse and mask diff output
    const lines = diff.split('\n');
    const maskedLines = lines.map(line => {
      // Keep diff metadata (@@, +++, ---, etc)
      if (line.startsWith('@@') || line.startsWith('+++') || line.startsWith('---') || 
          line.startsWith('diff ') || line.startsWith('index ')) {
        return line;
      }
      // Mask added/modified lines with values
      if (line.startsWith('+') || line.startsWith('-')) {
        const prefix = line[0];
        const content = line.slice(1);
        return prefix + maskEnvLine(content);
      }
      return maskEnvLine(line);
    });
    
    console.log(maskedLines.join('\n'));
  } catch (error) {
    // If file is new, show masked keys only
    console.log('New file added (showing keys only, values masked):');
    const content = fs.readFileSync(path.join(CONFIG.envRepoDir, '.env'), 'utf8');
    const lines = content.split('\n');
    const maskedLines = lines.map(maskEnvLine);
    
    // Show first 20 lines
    console.log(maskedLines.slice(0, 20).join('\n'));
    if (lines.length > 20) {
      console.log(`... (${lines.length - 20} more lines)`);
    }
  }
  
  console.log('━'.repeat(50));
}

/**
 * Confirm action with user
 */
async function confirm(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  try {
    const answer = await rl.question(`${message} (y/N): `);
    return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
  } finally {
    rl.close();
  }
}

/**
 * Commit and push changes
 */
async function commitAndPush() {
  if (!hasChanges()) {
    console.log('ℹ️  No changes to commit');
    return;
  }
  
  // Show diff
  showDiff();
  
  // Confirm
  console.log('');
  const confirmed = await confirm(`Push .env.${CONFIG.environment} to ${CONFIG.branch} branch?`);
  
  if (!confirmed) {
    console.log('❌ Push cancelled');
    process.exit(0);
  }
  
  console.log('\n📤 Committing and pushing changes...');
  
  // Add, commit, push
  exec(`git add .env`, { cwd: CONFIG.envRepoDir });
  exec(`git commit -m "${commitMessage}"`, { cwd: CONFIG.envRepoDir });
  exec(`git push origin ${CONFIG.branch}`, { cwd: CONFIG.envRepoDir });
  
  console.log(`✅ Changes pushed to ${CONFIG.branch} branch`);
}

/**
 * Show current env file info
 */
function showEnvInfo() {
  console.log('\n📊 Environment file status:');
  console.log(`  🌍 Environment: ${CONFIG.environment}`);
  console.log(`  🌿 Branch: ${CONFIG.branch}`);
  
  if (fs.existsSync(CONFIG.sourceEnvFile)) {
    const stats = fs.statSync(CONFIG.sourceEnvFile);
    const lines = fs.readFileSync(CONFIG.sourceEnvFile, 'utf8').split('\n');
    const envVarCount = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith('#');
    }).length;
    
    console.log(`  📍 Local file: ${CONFIG.sourceEnvFile}`);
    console.log(`  📅 Last modified: ${stats.mtime.toLocaleString()}`);
    console.log(`  🔢 Environment variables: ${envVarCount}`);
  } else {
    console.log(`  ⚠️  No .env.${CONFIG.environment} file found locally`);
  }
  
  console.log('');
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 SyncNapse Environment Push Tool\n');
  
  console.log(`📌 Target environment: ${CONFIG.environment}`);
  console.log(`📌 Repository: ${maskUrl(CONFIG.envRepoUrl)}`);
  console.log(`📌 Branch: ${CONFIG.branch}`);
  console.log(`📌 Commit message: "${commitMessage}"\n`);
  
  try {
    // Step 1: Ensure env repository is ready
    ensureEnvRepo();
    
    // Step 2: Copy local .env file to repository
    copyEnvToRepo();
    
    // Step 3: Commit and push changes
    await commitAndPush();
    
    // Step 4: Show info
    showEnvInfo();
    
    console.log('✨ Environment push completed successfully!\n');
    console.log('💡 Tip: Notify your team members to run `npm run env:sync`\n');
    
  } catch (error) {
    console.error('\n❌ Environment push failed');
    console.error(error.message);
    process.exit(1);
  }
}

// Run main function
main();

