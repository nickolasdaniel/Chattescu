@echo off
REM Simple proxy tester for Windows

if "%1"=="" (
    echo Usage: test-proxy.bat ^<proxy-url^>
    echo Example: test-proxy.bat http://123.456.789.012:8080
    echo.
    echo Or set PROXY_URL environment variable and run:
    echo test-proxy.bat
    pause
    exit /b 1
)

echo Testing proxy: %1
node test-proxy.js %1

if %errorlevel% equ 0 (
    echo.
    echo ✅ Proxy works! You can now use it with your app.
) else (
    echo.
    echo ❌ Proxy failed. Try a different one.
)

pause
