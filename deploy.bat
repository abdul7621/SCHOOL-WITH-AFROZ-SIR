@echo off
setlocal enabledelayedexpansion

echo =========================================
echo    7A ERP: 1-CLICK LOCAL-TO-VPS DEPLOY
echo =========================================
echo.

echo [1/2] Checking local changes and pushing to GitHub...
git add .
git diff --cached --quiet
if errorlevel 1 (
    if "%~1"=="" (
        git commit -m "deploy update"
    ) else (
        git commit -m "%*"
    )
    echo Committed local changes.
) else (
    echo No uncommitted local changes, proceeding to push...
)

git push origin main
if errorlevel 1 (
    echo.
    echo [ERROR] Git push failed! Please check your network or git credentials.
    exit /b 1
)

echo.
echo [2/2] Connecting to VPS (187.127.176.21) and running deployment...
ssh -o ServerAliveInterval=60 root@187.127.176.21 "cd /var/www/school-erp; git pull origin main; chmod +x deploy.sh; bash deploy.sh"

echo.
echo =========================================
echo    DEPLOYMENT FINISHED SUCCESSFULLY!
echo    Live at: http://187.127.176.21
echo =========================================
echo.
