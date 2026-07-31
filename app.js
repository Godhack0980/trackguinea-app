/**
 * TransConnekt - Phusion Passenger compatible entry point for o2switch
 * This file is the startup script configured in cPanel Node.js setup.
 *
 * It wraps the Next.js standalone server with proper path resolution
 * for Linux hosting environments.
 */
'use strict';

const path = require('path');
const fs = require('fs');

// Set the working directory to where this file lives (the app root on the server)
const appDir = __dirname;
process.chdir(appDir);

// Environment setup
process.env.NODE_ENV = 'production';
process.env.PORT = process.env.PORT || '3000';
process.env.HOSTNAME = process.env.HOSTNAME || '0.0.0.0';

// Point Next.js to the correct directory on Linux
// Override any hardcoded Windows paths from the build
const nextDir = path.join(appDir, '.next');

// Load .env files if they exist
const envFiles = ['.env.production', '.env.local', '.env'];
for (const envFile of envFiles) {
  const envPath = path.join(appDir, envFile);
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx > 0) {
            const key = trimmed.substring(0, eqIdx).trim();
            const val = trimmed.substring(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      });
    } catch (e) {}
    break; // Only load the first found env file
  }
}

console.log('> Starting TransConnekt on o2switch (Phusion Passenger)...');
console.log('> App directory:', appDir);
console.log('> Port:', process.env.PORT);
console.log('> NODE_ENV:', process.env.NODE_ENV);

// Check if .next/standalone/server.js exists (we are already inside standalone)
const standaloneServer = path.join(appDir, 'server.js');
// We ARE the standalone server - so just require next directly
try {
  const { startServer } = require('next/dist/server/lib/start-server');
  const nextConfig = require('./.next/required-server-files.json');

  const port = parseInt(process.env.PORT, 10) || 3000;
  const hostname = process.env.HOSTNAME || '0.0.0.0';

  startServer({
    dir: appDir,
    isDev: false,
    hostname,
    port,
    allowRetry: false,
  }).then(() => {
    console.log('> TransConnekt ready on port', port);
  }).catch((err) => {
    console.error('> Failed to start TransConnekt:', err);
    process.exit(1);
  });
} catch (e) {
  console.error('> Error loading Next.js startServer:', e.message);
  // Fallback: try loading the auto-generated server.js
  try {
    // Patch the config to use current directory instead of Windows path
    const serverJsPath = path.join(appDir, 'server.js');
    if (fs.existsSync(serverJsPath)) {
      // Read server.js and patch the outputFileTracingRoot
      let serverContent = fs.readFileSync(serverJsPath, 'utf8');
      // Replace any hardcoded absolute path with current directory
      serverContent = serverContent.replace(
        /"outputFileTracingRoot":"[^"]+"/g,
        `"outputFileTracingRoot":"${appDir.replace(/\\/g, '\\\\')}"`
      );
      // Write patched version to temp file
      const patchedPath = path.join(appDir, '.next', '_server_patched.js');
      fs.writeFileSync(patchedPath, serverContent, 'utf8');
      require(patchedPath);
    }
  } catch (e2) {
    console.error('> Fallback also failed:', e2.message);
    process.exit(1);
  }
}