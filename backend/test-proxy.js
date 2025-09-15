// Test script to check if your proxy works
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

async function testProxy(proxyUrl) {
  console.log(`Testing proxy: ${proxyUrl}`);
  
  try {
    const httpsAgent = new HttpsProxyAgent(proxyUrl);
    
    const response = await axios.get('https://kick.com/api/v2/channels/test', {
      httpsAgent,
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    console.log('✅ Proxy works! Status:', response.status);
    return true;
  } catch (error) {
    if (error.response?.status === 403) {
      console.log('❌ Still getting 403 - Kick is blocking this proxy too');
    } else {
      console.log('❌ Proxy error:', error.message);
    }
    return false;
  }
}

// Get proxy URL from command line or environment
const proxyUrl = process.argv[2] || process.env.PROXY_URL;

if (!proxyUrl) {
  console.log('Usage: node test-proxy.js <proxy-url>');
  console.log('Or set PROXY_URL environment variable');
  console.log('Example: node test-proxy.js http://123.456.789.012:8080');
  process.exit(1);
}

testProxy(proxyUrl).then(success => {
  if (success) {
    console.log('\n🎉 Great! Your proxy works. You can now use it with your app.');
  } else {
    console.log('\n💡 Try a different proxy or consider a paid service.');
  }
});
