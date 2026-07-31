$src = "C:\Users\kesso tech\.gemini\antigravity\scratch\trackguinea-app\trackguinea-app-main"
$dst = "C:\Users\kesso tech\.gemini\antigravity\scratch\trackguinea-app\transconnekt-o2switch.zip"

# Supprimer ancien zip si existe
if (Test-Path $dst) { Remove-Item $dst -Force }

# Dossiers et fichiers a inclure (uniquement les essentiels)
$toInclude = @(
    "src",
    "public",
    "docs"
)

# Fichiers racine a inclure
$rootFiles = @(
    ".env.local",
    ".firebaserc",
    ".gitignore",
    "app.js",
    "apphosting.yaml",
    "components.json",
    "firebase.json",
    "firestore.indexes.json",
    "firestore.rules",
    "next-env.d.ts",
    "next.config.js",
    "package-lock.json",
    "package.json",
    "postcss.config.mjs",
    "README.md",
    "server.js",
    "storage.rules",
    "tailwind.config.ts",
    "tsconfig.json"
)

Write-Host "Compression des dossiers..."
foreach ($folder in $toInclude) {
    $folderPath = Join-Path $src $folder
    if (Test-Path $folderPath) {
        Write-Host "  -> $folder"
        Compress-Archive -Path $folderPath -DestinationPath $dst -Update
    }
}

Write-Host "Compression des fichiers racine..."
foreach ($file in $rootFiles) {
    $filePath = Join-Path $src $file
    if (Test-Path $filePath) {
        Write-Host "  -> $file"
        Compress-Archive -Path $filePath -DestinationPath $dst -Update
    }
}

Write-Host ""
if (Test-Path $dst) {
    $size = (Get-Item $dst).Length / 1MB
    Write-Host "ZIP cree avec succes!"
    Write-Host "Taille: $([math]::Round($size, 2)) MB"
    Write-Host "Chemin: $dst"
} else {
    Write-Host "ERREUR: Le zip n'a pas ete cree"
}
