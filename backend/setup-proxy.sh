#!/bin/bash

# Chattescu Proxy Setup Script

echo "🔧 Chattescu Proxy Setup"
echo "========================"

# Check if PROXY_URL is set
if [ -z "$PROXY_URL" ]; then
    echo "❌ PROXY_URL environment variable not set"
    echo ""
    echo "Please set your proxy URL:"
    echo "export PROXY_URL='http://username:password@proxy.example.com:8080'"
    echo ""
    echo "Or run this script with a proxy URL:"
    echo "./setup-proxy.sh http://username:password@proxy.example.com:8080"
    exit 1
fi

echo "✅ Using proxy: $PROXY_URL"
echo ""

# Test the proxy
echo "🧪 Testing proxy..."
node test-proxy.js "$PROXY_URL"

if [ $? -eq 0 ]; then
    echo ""
    echo "🚀 Starting Chattescu backend with proxy..."
    npm start
else
    echo ""
    echo "❌ Proxy test failed. Please try a different proxy."
    echo ""
    echo "💡 Recommended proxy services:"
    echo "   - Smartproxy: https://smartproxy.com/ (~$7/month)"
    echo "   - Oxylabs: https://oxylabs.io/ (~$75/month)"
    echo "   - Free proxies: https://www.proxy-list.download/"
fi
