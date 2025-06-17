@echo off
title Quick Dev Startup
color 0B

echo ================================================================
echo           QUICK DEVELOPMENT STARTUP
echo ================================================================
echo Starting all services quickly for development...
echo.

echo Starting Service Registry...
start "Service Registry" cmd /k "cd /d "%~dp0service-registry" && npm start"
timeout /t 3 /nobreak >nul

echo Starting DNS Server...
start "DNS Server" cmd /k "cd /d "%~dp0dns-server" && npm start"
timeout /t 2 /nobreak >nul

echo Starting User Service...
start "User Service" cmd /k "cd /d "%~dp0services\user" && npm start"
timeout /t 3 /nobreak >nul

echo Starting API Gateway...
start "API Gateway" cmd /k "cd /d "%~dp0gateway" && npm start"

echo.
echo ================================================================
echo All services started in development mode!
echo ================================================================
echo.
echo Services:
echo - Service Registry: http://localhost:3100
echo - DNS Server:       UDP port 8600
echo - User Service:     http://localhost:3001
echo - API Gateway:      http://localhost:8080
echo.
echo Quick test: http://localhost:8080/user-service/health
echo.
pause 