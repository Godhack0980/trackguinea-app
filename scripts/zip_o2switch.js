const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const zipPath = path.resolve(rootDir, '..', 'transconnekt-o2switch.zip');
const nextCacheDir = path.join(rootDir, '.next', 'cache');

console.log('=== Cleaning temporary build cache before compression ===');
if (fs.existsSync(nextCacheDir)) {
  try {
    fs.rmSync(nextCacheDir, { recursive: true, force: true });
    console.log('Successfully removed .next/cache to reduce ZIP size and prevent lock issues!');
  } catch (e) {
    console.log('Could not remove .next/cache:', e.message);
  }
}

const psScript = `
$src = "${rootDir}"
$dst = "${zipPath}"

if (Test-Path $dst) { Remove-Item $dst -Force }

$itemsToCompress = @(
    ".next",
    "public",
    "src",
    "docs",
    "package.json",
    "package-lock.json",
    "next.config.js",
    "server.js",
    "app.js",
    ".env.local",
    "postcss.config.mjs",
    "tailwind.config.ts",
    "tsconfig.json",
    "components.json"
)

$fullPaths = $itemsToCompress | ForEach-Object { Join-Path $src $_ } | Where-Object { Test-Path $_ }

Write-Host "Compressing items into $dst..."
Compress-Archive -Path $fullPaths -DestinationPath $dst -CompressionLevel Optimal

if (Test-Path $dst) {
    $sizeMB = [math]::Round((Get-Item $dst).Length / 1MB, 2)
    Write-Host "SUCCESS: Archive created successfully!"
    Write-Host "Archive Path: $dst"
    Write-Host "Archive Size: $sizeMB MB"
} else {
    Write-Error "FAILED to create archive."
}
`;

const psPath = path.join(rootDir, 'scripts', 'run_zip.ps1');
fs.writeFileSync(psPath, psScript, 'utf8');

try {
  console.log('=== Compressing o2switch production package ===');
  execSync(`powershell -ExecutionPolicy Bypass -File "${psPath}"`, { stdio: 'inherit' });
} catch (err) {
  console.error('ZIP creation error:', err.message);
} finally {
  if (fs.existsSync(psPath)) fs.unlinkSync(psPath);
}
