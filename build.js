#!/usr/bin/env node

/**
 * Build script for Vercel deployment
 * Compiles TypeScript server code to JavaScript and copies public files
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

try {
  console.log('🔨 Building server...');
  
  const serverEntry = path.join(__dirname, 'server', '_core', 'index.ts');
  const outputDir = path.join(__dirname, 'dist');
  
  const command = `npx esbuild "${serverEntry}" --platform=node --packages=external --bundle --format=esm --outdir="${outputDir}"`;
  
  console.log(`Running: ${command}`);
  execSync(command, { stdio: 'inherit' });
  
  console.log('✅ Build completed successfully!');
  
  // Copy public directory to dist
  console.log('📋 Copying public files...');
  const publicDir = path.join(__dirname, 'public');
  const distPublicDir = path.join(outputDir, 'public');
  
  if (fs.existsSync(publicDir)) {
    // Remove existing dist/public if it exists
    if (fs.existsSync(distPublicDir)) {
      fs.rmSync(distPublicDir, { recursive: true });
    }
    
    // Copy public directory
    fs.cpSync(publicDir, distPublicDir, { recursive: true });
    console.log(`✅ Copied public files to ${distPublicDir}`);
  } else {
    console.warn(`⚠️  Public directory not found at ${publicDir}`);
  }
  
  process.exit(0);
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
