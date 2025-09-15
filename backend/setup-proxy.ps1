# Chattescu Proxy Setup Script for Windows PowerShell

Write-Host "🔧 Chattescu Proxy Setup" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan

# Check if PROXY_URL is set
if (-not $env:PROXY_URL) {
    Write-Host "❌ PROXY_URL environment variable not set" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please set your proxy URL:" -ForegroundColor Yellow
    Write-Host '$env:PROXY_URL = "http://username:password@proxy.example.com:8080"' -ForegroundColor Green
    Write-Host ""
    Write-Host "Or run this script with a proxy URL:" -ForegroundColor Yellow
    Write-Host ".\setup-proxy.ps1 http://username:password@proxy.example.com:8080" -ForegroundColor Green
    exit 1
}

Write-Host "✅ Using proxy: $env:PROXY_URL" -ForegroundColor Green
Write-Host ""

# Test the proxy
Write-Host "🧪 Testing proxy..." -ForegroundColor Yellow
node test-proxy.js $env:PROXY_URL

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "🚀 Starting Chattescu backend with proxy..." -ForegroundColor Green
    npm start
} else {
    Write-Host ""
    Write-Host "❌ Proxy test failed. Please try a different proxy." -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Recommended proxy services:" -ForegroundColor Yellow
    Write-Host "   - Smartproxy: https://smartproxy.com/ (~`$7/month)" -ForegroundColor White
    Write-Host "   - Oxylabs: https://oxylabs.io/ (~`$75/month)" -ForegroundColor White
    Write-Host "   - Free proxies: https://www.proxy-list.download/" -ForegroundColor White
}
