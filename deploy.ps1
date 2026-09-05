param (
    [string]$msg = "deploy update"
)

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "   7A ERP: 1-CLICK LOCAL-TO-VPS DEPLOY   " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Local Git Add, Commit & Push
Write-Host "[1/2] Checking local changes and pushing to GitHub..." -ForegroundColor Yellow
git add .
$status = git status --porcelain
if ($status) {
    git commit -m $msg
    Write-Host "Committed local changes: $msg" -ForegroundColor Green
} else {
    Write-Host "No uncommitted local changes, proceeding to push..." -ForegroundColor DarkGray
}

git push origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "Git push failed! Please check your network or git credentials." -ForegroundColor Red
    exit 1
}

# 2. Trigger Remote VPS Deployment via SSH
Write-Host ""
Write-Host "[2/2] Connecting to VPS (187.127.176.21) and running deployment..." -ForegroundColor Yellow
ssh -o ServerAliveInterval=60 root@187.127.176.21 'cd /var/www/school-erp; git pull origin main; chmod +x deploy.sh; bash deploy.sh'

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "   DEPLOYMENT FINISHED SUCCESSFULLY!     " -ForegroundColor Green
Write-Host "   Live at: http://187.127.176.21        " -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
