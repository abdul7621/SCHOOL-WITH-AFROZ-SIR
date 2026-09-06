@echo off
setlocal enabledelayedexpansion

echo ==========================================================================
echo         🚀 7A SCHOOL ERP: 1-CLICK PRODUCTION DEPLOYMENT ENGINE
echo ==========================================================================
echo.

set "VPS_IP=187.127.176.21"
set "VPS_DIR=/var/www/school-erp"
set "SERVER_FLAG="

:: Check for special flags using goto to avoid CMD parenthesis parsing traps
if /i "%~1"=="--status" goto :do_status
if /i "%~1"=="-s" goto :do_status
if /i "%~1"=="--logs" goto :do_logs
if /i "%~1"=="-l" goto :do_logs
if /i "%~1"=="--help" goto :do_help
if /i "%~1"=="-h" goto :do_help
if /i "%~1"=="/?" goto :do_help

set "COMMIT_MSG="
if /i "%~1"=="--backup" (
    set "SERVER_FLAG=--backup"
    if not "%~2"=="" (
        set "COMMIT_MSG=%~2"
    )
) else (
    if not "%~1"=="" (
        set "COMMIT_MSG=%~1"
    )
)

:: If commit message is still empty, generate timestamped message
if "%COMMIT_MSG%"=="" (
    set "COMMIT_MSG=deploy update [%DATE% %TIME%]"
)

:: Step 1: Check Git Status
echo [1/3] 🔍 Inspecting local changes...
git status --short
echo.

:: Stage all local changes
git add -A

:: Check if there are staged changes to commit
git diff --cached --quiet
if errorlevel 1 (
    echo 💾 Committing local changes: "!COMMIT_MSG!"
    git commit -m "!COMMIT_MSG!"
    if errorlevel 1 (
        echo [ERROR] Git commit failed!
        exit /b 1
    )
) else (
    echo ℹ️ No uncommitted local changes. Proceeding with existing commits...
)

:: Step 2: Push to GitHub
echo.
echo [2/3] 📤 Pushing to GitHub [origin/main]...
git push origin main
if errorlevel 1 (
    echo.
    echo [ERROR] Git push failed! Please check your network or git credentials.
    exit /b 1
)

:: Step 3: Trigger VPS Deployment
echo.
echo [3/3] 🚀 Connecting to VPS (%VPS_IP%) and executing deployment pipeline...
ssh -o ServerAliveInterval=60 root@%VPS_IP% "cd %VPS_DIR% && git checkout -- . && git pull origin main && chmod +x deploy.sh && bash deploy.sh %SERVER_FLAG%"
if errorlevel 1 (
    echo.
    echo ==========================================================================
    echo [ERROR] Deployment failed on VPS! Check the error messages above.
    echo ==========================================================================
    exit /b 1
)

echo.
echo ==========================================================================
echo    🎉 DEPLOYMENT FINISHED SUCCESSFULLY!
echo    Live Application: http://%VPS_IP%
echo    API Health      : http://%VPS_IP%/api/health
echo ==========================================================================
echo.
exit /b 0

:do_status
echo [STATUS] Querying live VPS system health...
ssh -o ServerAliveInterval=60 root@%VPS_IP% "cd %VPS_DIR% && bash deploy.sh --status"
exit /b %errorlevel%

:do_logs
echo [LOGS] Fetching recent backend PM2 logs...
ssh -o ServerAliveInterval=60 root@%VPS_IP% "pm2 logs school-erp-backend --lines 50 --nostream"
exit /b %errorlevel%

:do_help
echo USAGE:
echo   deploy.bat                       - Fast routine deploy [Backend + Frontend + Health]
echo   deploy.bat "Your commit message" - Deploy with custom commit message
echo   deploy.bat --backup              - Deploy AND create an immediate DB snapshot backup
echo   deploy.bat --status              - Check live VPS health and PM2 status
echo   deploy.bat --logs                - View recent backend logs on VPS
echo   deploy.bat --help                - Show this help screen
exit /b 0
