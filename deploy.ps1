<#
.SYNOPSIS
    7A School ERP — Enterprise 1-Click Production Deployment Engine (PowerShell)
.DESCRIPTION
    Automates local git commit, push, and remote VPS synchronization, Alembic migration,
    backend reload with health verification, frontend build, Nginx reload, and backup verification.
.EXAMPLE
    .\deploy.ps1
    .\deploy.ps1 "fix fee receipt styling"
    .\deploy.ps1 -Fast
    .\deploy.ps1 -Status
    .\deploy.ps1 -Logs
#>

param(
    [Parameter(Position=0)]
    [string]$Message = "",

    [switch]$Fast,
    [switch]$Status,
    [switch]$Logs
)

$VPS_IP = "187.127.176.21"
$VPS_DIR = "/var/www/school-erp"

Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "         🚀 7A SCHOOL ERP: 1-CLICK PRODUCTION DEPLOYMENT ENGINE         " -ForegroundColor Green
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host ""

if ($Status) {
    Write-Host "[STATUS] Querying live VPS system health..." -ForegroundColor Yellow
    ssh -o ServerAliveInterval=60 root@$VPS_IP "cd $VPS_DIR && bash deploy.sh --status"
    exit $LASTEXITCODE
}

if ($Logs) {
    Write-Host "[LOGS] Fetching recent backend PM2 logs..." -ForegroundColor Yellow
    ssh -o ServerAliveInterval=60 root@$VPS_IP "pm2 logs school-erp-backend --lines 50 --nostream"
    exit $LASTEXITCODE
}

$ServerFlag = ""
if ($Fast) {
    $ServerFlag = "--fast"
}

# Step 1: Check Local Git Status
Write-Host "[1/3] 🔍 Inspecting local changes..." -ForegroundColor Yellow
git status --short
Write-Host ""

git add -A

git diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
    if ([string]::IsNullOrWhiteSpace($Message)) {
        $timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm")
        $Message = "deploy update ($timestamp)"
    }
    Write-Host "💾 Committing local changes: `"$Message`"" -ForegroundColor Green
    git commit -m "$Message"
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Git commit failed!"
        exit 1
    }
} else {
    Write-Host "ℹ️ No uncommitted local changes detected. Proceeding with existing commits..." -ForegroundColor Gray
}

# Step 2: Push to GitHub
Write-Host ""
Write-Host "[2/3] 📤 Pushing to GitHub (origin/main)..." -ForegroundColor Yellow
git push origin main
if ($LASTEXITCODE -ne 0) {
    Write-Error "Git push failed! Please check your network or git credentials."
    exit 1
}

# Step 3: Trigger VPS Deployment
Write-Host ""
Write-Host "[3/3] 🚀 Connecting to VPS ($VPS_IP) and executing deployment pipeline..." -ForegroundColor Yellow
ssh -o ServerAliveInterval=60 root@$VPS_IP "cd $VPS_DIR && git checkout -- . && git pull origin main && chmod +x deploy.sh && bash deploy.sh $ServerFlag"
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "==========================================================================" -ForegroundColor Red
    Write-Host "[ERROR] Deployment failed on VPS! Check the logs above." -ForegroundColor Red
    Write-Host "==========================================================================" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "    🎉 DEPLOYMENT FINISHED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "    Live Application: http://$VPS_IP" -ForegroundColor White
Write-Host "    API Health      : http://$VPS_IP/api/health" -ForegroundColor White
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host ""
