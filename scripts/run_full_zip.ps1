
$src = "C:\Users\kesso tech\.gemini\antigravity\scratch\trackguinea-app\trackguinea-app-main"
$dst = "C:\Users\kesso tech\.gemini\antigravity\scratch\trackguinea-app\transconnekt-o2switch.zip"

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
