const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const zipPath = path.resolve(rootDir, '..', 'transconnekt-o2switch.zip');

console.log('=== Step 1: Running Next.js Production Build ===');
try {
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
  console.log('Build completed successfully!');
} catch (e) {
  console.error('Build failed:', e.message);
  process.exit(1);
}

// Copy static assets into standalone folder if standalone exists
const standaloneDir = path.join(rootDir, '.next', 'standalone');
const staticSrc = path.join(rootDir, '.next', 'static');
const staticDest = path.join(standaloneDir, '.next', 'static');
const publicSrc = path.join(rootDir, 'public');
const publicDest = path.join(standaloneDir, 'public');

if (fs.existsSync(standaloneDir)) {
  console.log('=== Copying static assets to standalone build ===');
  if (fs.existsSync(staticSrc)) {
    fs.mkdirSync(path.dirname(staticDest), { recursive: true });
    fs.cpSync(staticSrc, staticDest, { recursive: true });
  }
  if (fs.existsSync(publicSrc)) {
    fs.cpSync(publicSrc, publicDest, { recursive: true });
  }
}

// Ensure env files exist in all formats for cPanel (.env, .env.production, .env.local, env.production.txt)
const envSrc = path.join(rootDir, '.env.local');
const envDest = path.join(rootDir, '.env');
const envProdDest = path.join(rootDir, '.env.production');
const envTxtDest = path.join(rootDir, 'env.production.txt');

if (fs.existsSync(envSrc)) {
  fs.copyFileSync(envSrc, envDest);
  fs.copyFileSync(envSrc, envProdDest);
  fs.copyFileSync(envSrc, envTxtDest);
}

console.log('=== Step 2: Packaging FULL 400MB+ ZIP Archive (including node_modules) for o2switch ===');

const psScript = `
$src = "${rootDir}"
$dst = "${zipPath}"

if (Test-Path $dst) { Remove-Item $dst -Force }

$itemsToCompress = @(
    "node_modules",
    ".next",
    "public",
    "src",
    "docs",
    "package.json",
    "package-lock.json",
    "next.config.js",
    "server.js",
    "app.js",
    ".env",
    ".env.production",
    ".env.local",
    "env.production.txt",
    "postcss.config.mjs",
    "tailwind.config.ts",
    "tsconfig.json",
    "components.json"
)

$fullPaths = $itemsToCompress | ForEach-Object { Join-Path $src $_ } | Where-Object { Test-Path $_ }

Write-Host "Compressing ALL items including node_modules into $dst..."
Compress-Archive -Path $fullPaths -DestinationPath $dst -CompressionLevel Fastest

if (Test-Path $dst) {
    $sizeMB = [math]::Round((Get-Item $dst).Length / 1MB, 2)
    Write-Host "SUCCESS: Full 400MB+ Archive created successfully!"
    Write-Host "Archive Path: $dst"
    Write-Host "Archive Size: $sizeMB MB"
} else {
    Write-Error "FAILED to create archive."
}
`;

const psPath = path.join(rootDir, 'scripts', 'run_full_zip.ps1');
fs.writeFileSync(psPath, psScript, 'utf8');

try {
  execSync(`powershell -ExecutionPolicy Bypass -File "${psPath}"`, { stdio: 'inherit' });
} catch (err) {
  console.error('ZIP creation error:', err.message);
} finally {
  if (fs.existsSync(psPath)) fs.unlinkSync(psPath);
}
