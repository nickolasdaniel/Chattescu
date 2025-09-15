# Proxy Configuration Examples

This document shows how to configure different proxy services to bypass Kick API blocking.

## Environment Variables

Set the `PROXY_URL` environment variable to use a proxy:

```bash
# Example proxy URLs
export PROXY_URL="http://proxy-server:port"
export PROXY_URL="http://username:password@proxy-server:port"
export PROXY_URL="https://proxy-server:port"
```

## Free Proxy Services

### 1. Free Proxy Lists
- **Website**: https://www.proxy-list.download/
- **Format**: `http://ip:port`
- **Note**: Free proxies are often unreliable and slow

### 2. ProxyMesh
- **Website**: https://proxymesh.com/
- **Format**: `http://username:password@proxy.proxymesh.com:31280`
- **Note**: Free tier available, paid plans for better reliability

### 3. Bright Data (formerly Luminati)
- **Website**: https://brightdata.com/
- **Format**: `http://username:password@proxy.brightdata.com:port`
- **Note**: Enterprise-grade, paid service

## Paid Proxy Services (Recommended)

### 1. Oxylabs
- **Website**: https://oxylabs.io/
- **Format**: `http://username:password@proxy.oxylabs.io:port`
- **Note**: High-quality residential proxies

### 2. Smartproxy
- **Website**: https://smartproxy.com/
- **Format**: `http://username:password@gate.smartproxy.com:port`
- **Note**: Good balance of price and quality

### 3. Proxy-Cheap
- **Website**: https://proxy-cheap.com/
- **Format**: `http://username:password@proxy.proxy-cheap.com:port`
- **Note**: Budget-friendly option

## Configuration Examples

### Using Environment Variable
```bash
# Set proxy URL
export PROXY_URL="http://username:password@proxy.example.com:8080"

# Start the backend
npm start
```

### Using .env File
Create a `.env` file in the backend directory:
```
PROXY_URL=http://username:password@proxy.example.com:8080
SEVENTV_ENABLED=true
```

### Runtime Configuration
```javascript
// In your backend code
const sevenTVService = new SevenTVService();

// Set proxy at runtime
sevenTVService.setProxy('http://username:password@proxy.example.com:8080');

// Disable proxy
sevenTVService.setProxy(null);
```

## Testing Proxy Configuration

1. Set your proxy URL
2. Start the backend
3. Connect to a Kick channel
4. Check the logs for:
   - "7TV Service initialized with proxy: ..."
   - "Fetching 7TV cosmetics for username..."
   - No "Kick API blocked request" messages

## Troubleshooting

### Common Issues:
1. **Proxy authentication failed**: Check username/password
2. **Connection timeout**: Try a different proxy server
3. **Still getting 403 errors**: Try a residential proxy instead of datacenter
4. **Slow performance**: Use a proxy closer to your location

### Debug Mode:
Enable detailed logging by setting:
```bash
export DEBUG=seventv:*
```

## Alternative Solutions

If proxies don't work, you can:
1. Disable 7TV cosmetics: `export SEVENTV_ENABLED=false`
2. Use a VPN service
3. Deploy the backend to a different region
4. Use a different API endpoint if available
