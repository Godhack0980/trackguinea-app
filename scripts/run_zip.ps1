
$src = "C:\\Users\\kesso tech\\.gemini\\antigravity\\scratch\\trackguinea-app\\trackguinea-app-main\\.next\\standalone"
$dst = "C:\\Users\\kesso tech\\.gemini\\antigravity\\scratch\\trackguinea-app\\transconnekt-o2switch.zip"

if (Test-Path $dst) { Remove-Item $dst -Force }

Write-Host "Compressing standalone directory into $dst..."
Compress-Archive -Path "$src\*" -DestinationPath $dst -CompressionLevel Optimal

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
