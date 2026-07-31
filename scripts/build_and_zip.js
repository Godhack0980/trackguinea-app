const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const zipPath = path.resolve(rootDir, '..', 'transconnekt-o2switch.zip');

// ─── Step 1: Build Next.js ────────────────────────────────────────────────────
console.log('=== Step 1: Building Next.js Production App (Standalone Mode) ===');
try {
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
  console.log('Build completed successfully!');
} catch (e) {
  console.error('Build failed:', e.message);
  process.exit(1);
}

// ─── Step 2: Verify standalone exists ────────────────────────────────────────
const standaloneDir = path.join(rootDir, '.next', 'standalone');
if (!fs.existsSync(standaloneDir)) {
  console.error('ERROR: .next/standalone directory not found! Make sure next.config.js has output: "standalone"');
  process.exit(1);
}

// ─── Step 3: Copy static assets into standalone ──────────────────────────────
console.log('=== Step 2: Copying CSS/JS/Image static assets into standalone ===');

const staticSrc  = path.join(rootDir, '.next', 'static');
const staticDest = path.join(standaloneDir, '.next', 'static');
const publicSrc  = path.join(rootDir, 'public');
const publicDest = path.join(standaloneDir, 'public');

if (fs.existsSync(staticSrc)) {
  if (fs.existsSync(staticDest)) fs.rmSync(staticDest, { recursive: true, force: true });
  fs.cpSync(staticSrc, staticDest, { recursive: true });
  console.log('  ✓ Copied .next/static → standalone/.next/static (CSS + JS chunks)');
}

if (fs.existsSync(publicSrc)) {
  if (fs.existsSync(publicDest)) fs.rmSync(publicDest, { recursive: true, force: true });
  fs.cpSync(publicSrc, publicDest, { recursive: true });
  console.log('  ✓ Copied public/ → standalone/public (images, icons, fonts)');
}

// ─── Step 4: Copy src/messages into standalone for runtime i18n loading ──────
const messagesSrc  = path.join(rootDir, 'src', 'messages');
const messagesDest = path.join(standaloneDir, 'src', 'messages');
if (fs.existsSync(messagesSrc)) {
  if (fs.existsSync(messagesDest)) fs.rmSync(messagesDest, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(messagesDest), { recursive: true });
  fs.cpSync(messagesSrc, messagesDest, { recursive: true });
  console.log('  ✓ Copied src/messages/ → standalone/src/messages (translations)');
}

// ─── Step 5: Copy .env files into standalone ─────────────────────────────────
const envFiles = ['.env', '.env.local', '.env.production'];
for (const envFile of envFiles) {
  const src = path.join(rootDir, envFile);
  const dst = path.join(standaloneDir, envFile);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dst);
    console.log(`  ✓ Copied ${envFile} → standalone/`);
  }
}

// Also write env.production.txt
const envLocalSrc = path.join(rootDir, '.env.local');
if (fs.existsSync(envLocalSrc)) {
  fs.copyFileSync(envLocalSrc, path.join(standaloneDir, 'env.production.txt'));
  console.log('  ✓ Copied .env.local → standalone/env.production.txt');
}

// ─── Step 6: Write Linux-compatible server.js into standalone ─────────────────
// The auto-generated server.js has a hardcoded Windows path in outputFileTracingRoot.
// We replace it with a dynamic version that patches the path at runtime on Linux.
console.log('  ✓ Writing Linux-compatible server.js into standalone...');

const linuxServerJs = `'use strict';
const path = require('path');
const fs = require('fs');

// This file is a Linux-compatible wrapper for Next.js standalone on o2switch.
// The original server.js has hardcoded Windows paths - this version uses __dirname.
const appDir = __dirname;
process.chdir(appDir);
process.env.NODE_ENV = 'production';

const currentPort = parseInt(process.env.PORT, 10) || 3000;
const hostname = process.env.HOSTNAME || '0.0.0.0';

// Load environment variables from .env files
const envFiles = ['.env.production', '.env.local', '.env'];
for (const envFile of envFiles) {
  const envPath = path.join(appDir, envFile);
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const eqIdx = trimmed.indexOf('=');
          const key = trimmed.substring(0, eqIdx).trim();
          const val = trimmed.substring(eqIdx + 1).trim().replace(/^["\\']/,'').replace(/["\\']\$/,'');
          if (!process.env[key]) process.env[key] = val;
        }
      });
      console.log('> Loaded env from', envFile);
    } catch(e) {}
    break;
  }
}

console.log('> TransConnekt starting on o2switch (Phusion Passenger)');
console.log('> Dir:', appDir, '| Port:', currentPort);

let keepAliveTimeout = parseInt(process.env.KEEP_ALIVE_TIMEOUT, 10);
if (Number.isNaN(keepAliveTimeout) || !Number.isFinite(keepAliveTimeout) || keepAliveTimeout < 0) {
  keepAliveTimeout = undefined;
}

// Load the Next.js config from required-server-files.json
let nextConfig = {};
try {
  const reqFiles = JSON.parse(fs.readFileSync(path.join(appDir, '.next', 'required-server-files.json'), 'utf8'));
  nextConfig = reqFiles.config || {};
} catch(e) {
  console.warn('> Could not load required-server-files.json, using defaults');
}

// Patch any hardcoded paths to use current directory
nextConfig.outputFileTracingRoot = appDir;
process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(nextConfig);

require('next');
const { startServer } = require('next/dist/server/lib/start-server');

startServer({
  dir: appDir,
  isDev: false,
  config: nextConfig,
  hostname,
  port: currentPort,
  allowRetry: false,
  keepAliveTimeout,
}).catch((err) => {
  console.error('> Server startup error:', err);
  process.exit(1);
});
`;

fs.writeFileSync(path.join(standaloneDir, 'server.js'), linuxServerJs, 'utf8');
console.log('  ✓ Written Linux-compatible server.js → standalone/server.js');

// Also write app.js as alias for Passenger
const appJsContent = `// Phusion Passenger entry point - aliases server.js\nrequire('./server.js');\n`;
fs.writeFileSync(path.join(standaloneDir, 'app.js'), appJsContent, 'utf8');
console.log('  ✓ Written app.js → standalone/app.js (Passenger entry alias)');

// ─── Step 7: Clean .next/cache from standalone to reduce size ────────────────
const standaloneCacheDir = path.join(standaloneDir, '.next', 'cache');
if (fs.existsSync(standaloneCacheDir)) {
  try {
    fs.rmSync(standaloneCacheDir, { recursive: true, force: true });
    console.log('  ✓ Removed standalone .next/cache (reduces ZIP size)');
  } catch (e) {}
}

// ─── Step 8: ZIP the standalone directory ─────────────────────────────────────
console.log('=== Step 3: Packaging ZIP Archive (standalone only) for o2switch ===');

const psScript = `
$src = "${standaloneDir.replace(/\\/g, '\\\\')}"
$dst = "${zipPath.replace(/\\/g, '\\\\')}"

if (Test-Path $dst) { Remove-Item $dst -Force }

Write-Host "Compressing standalone directory into $dst..."
Compress-Archive -Path "$src\\*" -DestinationPath $dst -CompressionLevel Optimal

if (Test-Path $dst) {
    $sizeMB = [math]::Round((Get-Item $dst).Length / 1MB, 2)
    Write-Host "SUCCESS: Standalone ZIP archive created!"
    Write-Host "Archive Path: $dst"
    Write-Host "Archive Size: $sizeMB MB"
    Write-Host ""
    Write-Host "IMPORTANT: This ZIP contains a self-contained Next.js server."
    Write-Host "On o2switch: Extract into your app root, set startup file to 'server.js'."
    Write-Host "NO npm install needed - node_modules is already bundled!"
} else {
    Write-Error "FAILED to create archive."
}
`;

const psPath = path.join(rootDir, 'scripts', 'run_zip.ps1');
fs.writeFileSync(psPath, psScript, 'utf8');

try {
  execSync(`powershell -ExecutionPolicy Bypass -File "${psPath}"`, {
    cwd: rootDir,
    stdio: 'inherit',
  });
} catch (e) {
  console.error('ZIP packaging failed:', e.message);
  process.exit(1);
}
