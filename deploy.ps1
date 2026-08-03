Write-Host ""
Write-Host "====================================="
Write-Host "  Déploiement TransConnekt"
Write-Host "====================================="
Write-Host ""

# Aller dans le dossier du projet
Set-Location $PSScriptRoot

Write-Host "1/5 - Installation des dépendances..."
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur npm install"
    exit 1
}

Write-Host ""
Write-Host "2/5 - Build Next.js..."
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur build"
    exit 1
}

Write-Host ""
Write-Host "3/5 - Création de l'archive..."

Remove-Item deploy -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item transconnekt.tar.gz -Force -ErrorAction SilentlyContinue

New-Item -ItemType Directory deploy | Out-Null

Copy-Item ".next\standalone\*" deploy -Recurse -Force

Copy-Item ".next\static" "deploy\.next\" -Recurse -Force

Copy-Item public deploy -Recurse -Force

tar -C deploy -czf transconnekt.tar.gz .

Write-Host ""
Write-Host "4/5 - Envoi sur le serveur..."

scp -i "$env:USERPROFILE\.ssh\github_transconnekt" `
    transconnekt.tar.gz `
    camo1783@reveil.o2switch.net:/home/camo1783/deploy/

if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur SCP"
    exit 1
}

Write-Host ""
Write-Host "5/5 - Déploiement..."

ssh -i "$env:USERPROFILE\.ssh\github_transconnekt" `
    camo1783@reveil.o2switch.net `
    "bash ~/deploy/deploy.sh"

Write-Host ""
Write-Host "====================================="
Write-Host " Déploiement terminé !"
Write-Host "====================================="