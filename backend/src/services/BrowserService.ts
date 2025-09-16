// backend/src/services/BrowserService.ts

import puppeteer, { Browser, Page } from 'puppeteer';

export class BrowserService {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🌐 Initializing browser session...');
      
      this.browser = await puppeteer.launch({
        headless: true, // Use headless mode
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });

      this.page = await this.browser.newPage();
      
      // Set realistic viewport and user agent
      await this.page.setViewport({ width: 1920, height: 1080 });
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Visit Kick.com to establish session
      console.log('🏠 Visiting Kick.com to establish session...');
      await this.page.goto('https://kick.com', { waitUntil: 'networkidle2' });
      
      // Wait a bit to let any tracking/analytics load
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      this.isInitialized = true;
      console.log('✅ Browser session initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize browser session:', error);
      throw error;
    }
  }

  async getChatroomId(channelName: string): Promise<string | null> {
    if (!this.isInitialized || !this.page) {
      await this.initialize();
    }

    try {
      console.log(`🔍 Getting chatroom ID for ${channelName} using browser session`);
      
      // First, visit the channel page to establish context
      const channelUrl = `https://kick.com/${channelName}`;
      console.log(`📄 Navigating to ${channelUrl}`);
      
      await this.page!.goto(channelUrl, { waitUntil: 'networkidle2' });
      
      // Wait for the page to load
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Method 1: Try to make API call from within the browser context
      console.log('🔗 Attempting API call from browser context...');
      
      const chatroomData = await this.page!.evaluate(async (channelName) => {
        const results = [];
        
        try {
          // Try the chatroom endpoint
          console.log('Trying chatroom endpoint from browser...');
          const response = await fetch(`https://kick.com/api/v2/channels/${channelName}/chatroom`);
          console.log('Chatroom endpoint response status:', response.status);
          if (response.ok) {
            const data = await response.json();
            console.log('Chatroom endpoint data:', data);
            return { success: true, data, source: 'chatroom_endpoint' };
          } else {
            results.push(`Chatroom endpoint: ${response.status}`);
          }
        } catch (error) {
          console.log('Chatroom endpoint error:', error);
          results.push(`Chatroom endpoint error: ${error}`);
        }

        try {
          // Try the general channel endpoint
          console.log('Trying channel endpoint from browser...');
          const response = await fetch(`https://kick.com/api/v2/channels/${channelName}`);
          console.log('Channel endpoint response status:', response.status);
          if (response.ok) {
            const data = await response.json();
            console.log('Channel endpoint data:', data);
            return { success: true, data, source: 'channel_endpoint' };
          } else {
            results.push(`Channel endpoint: ${response.status}`);
          }
        } catch (error) {
          console.log('Channel endpoint error:', error);
          results.push(`Channel endpoint error: ${error}`);
        }

        return { success: false, error: 'All API calls failed', details: results };
      }, channelName);

      if (chatroomData.success) {
        console.log(`✅ Successfully got data from ${chatroomData.source}:`, chatroomData.data);
        
        // Extract chatroom ID from response
        const data = chatroomData.data as any;
        const chatroomId = data.id || data.chatroom?.id;
        
        if (chatroomId) {
          console.log(`🎉 Found chatroom ID: ${chatroomId}`);
          return chatroomId.toString();
        }
      }

      // Method 2: Extract from page content/scripts
      console.log('📜 Trying to extract from page content...');
      
      const extractedId = await this.page!.evaluate(() => {
        // This code runs in the browser context where window and document are available
        const results = [];
        try {
          // Look for chatroom ID in window objects
          const win = window as any;
          const windowKeys = Object.keys(win);
          console.log(`Found ${windowKeys.length} window keys`);
          
          for (const key of windowKeys) {
            if (key.includes('__') && (key.includes('STATE') || key.includes('INITIAL'))) {
              try {
                const state = win[key];
                if (state && typeof state === 'object') {
                  console.log(`Checking window.${key}:`, typeof state);
                  const stateStr = JSON.stringify(state);
                  
                  // More comprehensive patterns
                  const patterns = [
                    /"chatroom":\s*{\s*[^}]*"id":\s*(\d+)/,
                    /"chatroom_id":\s*(\d+)/,
                    /chatroom[_-]?id["\s]*[:=]["\s]*(\d+)/i,
                    /"id":\s*(\d{8,})/g // Look for any 8+ digit ID
                  ];
                  
                  for (const pattern of patterns) {
                    if (pattern.global) {
                      const matches = Array.from(stateStr.matchAll(pattern));
                      if (matches.length > 0) {
                        console.log(`Found potential IDs in ${key}:`, matches.map(m => m[1]));
                        // Return the first reasonable ID
                        for (const match of matches) {
                          const id = match[1];
                          if (id && parseInt(id) > 1000000) {
                            console.log(`Using ID from window state: ${id}`);
                            return id;
                          }
                        }
                      }
                    } else {
                      const match = stateStr.match(pattern);
                      if (match && match[1]) {
                        console.log(`Found chatroom ID in ${key}: ${match[1]}`);
                        return match[1];
                      }
                    }
                  }
                }
              } catch (e) {
                console.log(`Error processing ${key}:`, e);
              }
            }
          }

          // Look in script tags
          const doc = document as any;
          const scripts = doc.querySelectorAll('script');
          console.log(`Found ${scripts.length} script tags`);
          
          for (let i = 0; i < scripts.length; i++) {
            const script = scripts[i];
            const content = script.textContent || script.innerHTML;
            if (content && (content.includes('chatroom') || content.includes('pusher') || content.includes('websocket'))) {
              console.log(`Script ${i} contains relevant content (${content.length} chars)`);
              
              const patterns = [
                /"chatroom":\s*{\s*[^}]*"id":\s*(\d+)/,
                /"chatroom_id":\s*(\d+)/,
                /chatroom[_-]?id["\s]*[:=]["\s]*(\d+)/i,
                /chatrooms\.(\d+)\.v2/,
                /chatroom_(\d+)/,
                /"pusher".*"chatroom".*(\d+)/i,
                /subscribe.*chatroom.*(\d+)/i
              ];
              
              for (const pattern of patterns) {
                const match = content.match(pattern);
                if (match && match[1]) {
                  console.log(`Found chatroom ID in script ${i}: ${match[1]}`);
                  return match[1];
                }
              }
              
              // Show a sample for debugging
              if (content.length > 100) {
                const sample = content.substring(0, 200) + '...';
                console.log(`Script ${i} sample:`, sample);
              }
            }
          }
          
          // Look for meta tags or data attributes
          const metas = doc.querySelectorAll('meta[name*="chatroom"], meta[property*="chatroom"], [data-chatroom-id], [data-channel-id]');
          console.log(`Found ${metas.length} potential meta/data elements`);
          
          for (const meta of metas) {
            const content = meta.getAttribute('content') || meta.getAttribute('data-chatroom-id') || meta.getAttribute('data-channel-id');
            if (content && /^\d{6,}$/.test(content)) {
              console.log(`Found ID in meta/data: ${content}`);
              return content;
            }
          }
          
        } catch (error) {
          console.log('Error in page evaluation:', error);
        }

        console.log('No chatroom ID found in page content');
        return null;
      });

      if (extractedId) {
        console.log(`🎉 Extracted chatroom ID from page: ${extractedId}`);
        return extractedId;
      }

      console.log('❌ Could not find chatroom ID');
      return null;

    } catch (error) {
      console.error(`❌ Browser service error for ${channelName}:`, error);
      return null;
    }
  }

  async cleanup(): Promise<void> {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        this.page = null;
        this.isInitialized = false;
        console.log('🧹 Browser session cleaned up');
      }
    } catch (error) {
      console.error('❌ Error cleaning up browser:', error);
    }
  }
}
