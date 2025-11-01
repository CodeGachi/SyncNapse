#!/usr/bin/env node
/**
 * MinIO Sample Files Seeding Script
 * 
 * This script uploads sample files to MinIO S3 bucket to match the seed data.
 * Run: npm run seed:minio
 */

import { S3Client, PutObjectCommand, CreateBucketCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// MinIO Configuration (from .env)
const MINIO_ENDPOINT = process.env.STORAGE_ENDPOINT || 'http://localhost:9000';
const MINIO_ACCESS_KEY = process.env.STORAGE_ACCESS_KEY_ID || 'minioadmin';
const MINIO_SECRET_KEY = process.env.STORAGE_SECRET_ACCESS_KEY || 'minioadmin123';
const MINIO_BUCKET = process.env.STORAGE_BUCKET || 'syncnapse-files';
const MINIO_REGION = process.env.STORAGE_REGION || 'us-east-1';

// Sample files directory
const SAMPLES_DIR = join(__dirname, '../backend/var/samples');

console.log('🚀 MinIO Sample Files Seeding Script');
console.log('=====================================');
// Mask endpoint URL to avoid exposing internal server addresses
const maskedEndpoint = MINIO_ENDPOINT.replace(/(https?:\/\/)([^:]+)(:\d+)?/, '$1***$3');
console.log(`Endpoint: ${maskedEndpoint}`);
console.log(`Bucket: ${MINIO_BUCKET}`);
console.log(`Samples Directory: ${SAMPLES_DIR}\n`);

// Initialize S3 client
const s3Client = new S3Client({
  endpoint: MINIO_ENDPOINT,
  region: MINIO_REGION,
  credentials: {
    accessKeyId: MINIO_ACCESS_KEY,
    secretAccessKey: MINIO_SECRET_KEY,
  },
  forcePathStyle: true, // Required for MinIO
});

/**
 * Sample files to upload (matching 002_seed_data.sql)
 */
const FILES_TO_UPLOAD = [
  // Documents (PDF slides)
  { key: 'documents/sample-slides-ds.pdf', type: 'application/pdf', size: 1024 * 500 }, // 500KB
  { key: 'documents/sample-slides-bst.pdf', type: 'application/pdf', size: 1024 * 450 },
  { key: 'documents/sample-slides-graphs.pdf', type: 'application/pdf', size: 1024 * 600 },
  { key: 'documents/sample-slides-calculus.pdf', type: 'application/pdf', size: 1024 * 550 },
  { key: 'documents/sample-slides-ml.pdf', type: 'application/pdf', size: 1024 * 700 },
  
  // Audio files (MP3 lectures)
  { key: 'audio/sample-lecture-01.mp3', type: 'audio/mpeg', size: 1024 * 1024 * 5 }, // 5MB
  { key: 'audio/sample-lecture-02.mp3', type: 'audio/mpeg', size: 1024 * 1024 * 4 },
  { key: 'audio/sample-lecture-03.mp3', type: 'audio/mpeg', size: 1024 * 1024 * 6 },
  { key: 'audio/sample-lecture-04.mp3', type: 'audio/mpeg', size: 1024 * 1024 * 5 },
  { key: 'audio/sample-lecture-05.mp3', type: 'audio/mpeg', size: 1024 * 1024 * 7 },
  
  // Pages (PNG images)
  { key: 'pages/ds-intro-p001.png', type: 'image/png', size: 1024 * 200 }, // 200KB
  { key: 'pages/ds-intro-p002.png', type: 'image/png', size: 1024 * 220 },
  { key: 'pages/ds-intro-p003.png', type: 'image/png', size: 1024 * 210 },
  { key: 'pages/bst-p001.png', type: 'image/png', size: 1024 * 180 },
  { key: 'pages/bst-p002.png', type: 'image/png', size: 1024 * 190 },
  { key: 'pages/graphs-p001.png', type: 'image/png', size: 1024 * 240 },
  { key: 'pages/graphs-p002.png', type: 'image/png', size: 1024 * 250 },
  { key: 'pages/graphs-p003.png', type: 'image/png', size: 1024 * 230 },
  
  // Render (canonical pages)
  { key: 'render/canonical-001.png', type: 'image/png', size: 1024 * 300 },
  { key: 'render/canonical-002.png', type: 'image/png', size: 1024 * 280 },
  { key: 'render/canonical-003.png', type: 'image/png', size: 1024 * 320 },
  
  // Uploads (completed)
  { key: 'uploads/user-test-002/lecture-recording-01.mp3', type: 'audio/mpeg', size: 1024 * 1024 * 50 }, // 50MB
  { key: 'uploads/user-test-003/notes-scan.pdf', type: 'application/pdf', size: 1024 * 1024 * 10 }, // 10MB
];

/**
 * Generate dummy file content
 */
function generateDummyContent(size, mimeType) {
  // Create appropriate dummy content based on type
  if (mimeType === 'application/pdf') {
    // Minimal valid PDF header
    const header = Buffer.from('%PDF-1.4\n%âãÏÓ\n');
    const content = Buffer.alloc(size - header.length, 'X');
    return Buffer.concat([header, content]);
  } else if (mimeType === 'audio/mpeg') {
    // Minimal valid MP3 header (ID3v2)
    const header = Buffer.from('ID3\x03\x00\x00\x00\x00\x00\x00');
    const content = Buffer.alloc(size - header.length, 0);
    return Buffer.concat([header, content]);
  } else if (mimeType === 'image/png') {
    // Minimal valid PNG header
    const header = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const content = Buffer.alloc(size - header.length, 0);
    return Buffer.concat([header, content]);
  } else {
    // Generic binary content
    return Buffer.alloc(size, 'X');
  }
}

/**
 * Ensure bucket exists
 */
async function ensureBucket() {
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: MINIO_BUCKET }));
    console.log(`✓ Bucket '${MINIO_BUCKET}' already exists`);
  } catch (error) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      console.log(`Creating bucket '${MINIO_BUCKET}'...`);
      try {
        await s3Client.send(new CreateBucketCommand({ Bucket: MINIO_BUCKET }));
        console.log(`✓ Bucket '${MINIO_BUCKET}' created successfully`);
      } catch (createError) {
        console.error(`✗ Failed to create bucket: ${createError.message}`);
        throw createError;
      }
    } else {
      console.error(`✗ Failed to check bucket: ${error.message}`);
      throw error;
    }
  }
}

/**
 * Upload a file to MinIO
 */
async function uploadFile(file) {
  const { key, type, size } = file;
  
  console.log(`Uploading: ${key} (${(size / 1024).toFixed(2)} KB)...`);
  
  try {
    // Generate dummy content
    const content = generateDummyContent(size, type);
    
    // Upload to MinIO
    const command = new PutObjectCommand({
      Bucket: MINIO_BUCKET,
      Key: key,
      Body: content,
      ContentType: type,
      Metadata: {
        'seed-script': 'true',
        'generated-at': new Date().toISOString(),
      },
    });
    
    await s3Client.send(command);
    console.log(`  ✓ Uploaded: ${key}`);
    
    return { success: true, key };
  } catch (error) {
    console.error(`  ✗ Failed to upload ${key}: ${error.message}`);
    return { success: false, key, error: error.message };
  }
}

/**
 * Save sample files locally (optional, for debugging)
 */
function saveSampleLocally(file) {
  const { key, type, size } = file;
  const localPath = join(SAMPLES_DIR, key);
  const localDir = dirname(localPath);
  
  // Create directory if it doesn't exist
  if (!existsSync(localDir)) {
    mkdirSync(localDir, { recursive: true });
  }
  
  // Generate and save content
  const content = generateDummyContent(size, type);
  writeFileSync(localPath, content);
}

/**
 * Main execution
 */
async function main() {
  try {
    // Step 1: Ensure bucket exists
    console.log('Step 1: Checking bucket...');
    await ensureBucket();
    console.log('');
    
    // Step 2: Upload files
    console.log(`Step 2: Uploading ${FILES_TO_UPLOAD.length} files...`);
    console.log('');
    
    const results = [];
    for (const file of FILES_TO_UPLOAD) {
      const result = await uploadFile(file);
      results.push(result);
    }
    
    console.log('');
    console.log('=====================================');
    console.log('Upload Summary:');
    console.log(`  ✓ Success: ${results.filter(r => r.success).length}`);
    console.log(`  ✗ Failed: ${results.filter(r => !r.success).length}`);
    console.log('');
    
    if (results.some(r => !r.success)) {
      console.log('Failed files:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`  - ${r.key}: ${r.error}`);
      });
      process.exit(1);
    }
    
    console.log('✅ All sample files uploaded successfully!');
    console.log('');
    console.log('Access MinIO Console: http://localhost:9001');
    console.log('  Username: minioadmin');
    console.log('  Password: minioadmin123');
    console.log('');
    
  } catch (error) {
    console.error('');
    console.error('❌ Error during seeding:');
    console.error(error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main, uploadFile, ensureBucket };

