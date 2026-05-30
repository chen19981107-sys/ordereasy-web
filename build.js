#!/usr/bin/env node

/**
 * Build script for Vercel deployment
 * Compiles TypeScript server code to JavaScript
 */

const { execSync } = require('child_process');
const path = require('path');

try {
  console.log('🔨 Building server...');
  
  const serverEntry = path.join(__dirname, 'server', '_core', 'index.ts');
  const outputDir = path.join(__dirname, 'dist');
  
  const command = `npx esbuild "${serverEntry}" --platform=node --packages=external --bundle --format=esm --outdir="${outputDir}"`;
  
  console.log(`Running: ${command}`);
  execSync(command, { stdio: 'inherit' });
  
  console.log('✅ Build completed successfully!');
  process.exit(0);
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
