@echo off
REM Chattescu Proxy Setup Script for Windows Command Prompt

echo 🔧 Chattescu Proxy Setup
echo ========================

REM Check if PROXY_URL is set
if "%PROXY_URL%"=="" (
    echo ❌ PROXY_URL environment variable not set
    echo.
    echo Please set your proxy URL:
    echo set PROXY_URL=http://username:password@proxy.example.com:8080
    echo.
    echo Or run this script with a proxy URL:
    echo setup-proxy.bat http://username:password@proxy.example.com:8080
    pause
    exit /b 1
)

echo ✅ Using proxy: %PROXY_URL%
echo.

REM Test the proxy
echo 🧪 Testing proxy...
node test-proxy.js %PROXY_URL%

if %errorlevel% equ 0 (
    echo.
    echo 🚀 Starting Chattescu backend with proxy...
    npm start
) else (
    echo.
    echo ❌ Proxy test failed. Please try a different proxy.
    echo.
    echo 💡 Recommended proxy services:
    echo    - Smartproxy: https://smartproxy.com/ (~$7/month)
    echo    - Oxylabs: https://oxylabs.io/ (~$75/month)
    echo    - Free proxies: https://www.proxy-list.download/
    pause
)
