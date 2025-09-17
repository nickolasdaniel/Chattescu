// backend/src/services/SevenTVService.ts

import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SevenTVCosmetics } from '../types';

export class SevenTVService {
  private readonly SEVENTV_API_BASE = 'https://7tv.io/v3';
  private readonly KICK_API_BASE = 'https://kick.com/api/v2';
  private cosmeticsCache = new Map<string, SevenTVCosmetics>();
  private enabled = process.env.SEVENTV_ENABLED !== 'false'; // Feature flag to enable/disable 7TV cosmetics
  private proxyUrl = process.env.PROXY_URL; // Optional proxy URL
  private httpsAgent: HttpsProxyAgent<string> | undefined;
  private userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  ];
  private requestCount = 0;

  constructor() {
    // Initialize proxy agent if proxy URL is provided
    if (this.proxyUrl) {
      this.httpsAgent = new HttpsProxyAgent(this.proxyUrl);
      console.log(`7TV Service initialized with proxy: ${this.proxyUrl}`);
    } else {
      console.log('7TV Service initialized without proxy');
    }
  }

  private async fetchPaintFromCosmetics(paintId: string): Promise<any> {
    try {
      console.log(`Fetching paint data from cosmetics API for paint ID: ${paintId}`);
      
      // Try the cosmetics API that might include paint data
      const response = await axios.get(`https://7tv.io/v3/cosmetics`, {
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Referer': 'https://7tv.io/',
          'Origin': 'https://7tv.io'
        },
        timeout: 10000,
        maxRedirects: 5,
        validateStatus: (status) => status < 500,
        ...(this.httpsAgent && { httpsAgent: this.httpsAgent }),
      });

      // Look for the paint in the response
      const data = response.data;
      if (data.paints && Array.isArray(data.paints)) {
        const paint = data.paints.find((p: any) => p.id === paintId);
        if (paint) {
          console.log(`Found paint data:`, paint);
          return paint;
        }
      }
      
      console.log(`Paint ${paintId} not found in cosmetics API`);
      return null;
    } catch (error) {
      console.error(`Failed to fetch paint data for ${paintId}:`, error);
      return null;
    }
  }

  private getRandomUserAgent(): string {
    const randomIndex = Math.floor(Math.random() * this.userAgents.length);
    const selectedAgent = this.userAgents[randomIndex];
    if (selectedAgent) {
      return selectedAgent;
    }
    // Fallback to first user agent if somehow undefined
    return this.userAgents[0] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getUserCosmetics(username: string): Promise<SevenTVCosmetics | null> {
    // Check if 7TV cosmetics are enabled
    if (!this.enabled) {
      console.log(`7TV cosmetics disabled for ${username}`);
      return null;
    }

    try {
      // Check cache first
      const cached = this.cosmeticsCache.get(username.toLowerCase());
      if (cached) {
        console.log(`Using cached 7TV cosmetics for ${username}`);
        return cached;
      }

      console.log(`Fetching 7TV cosmetics for ${username}...`);
      
      // Get Kick user ID first
      const kickUserId = await this.getKickUserId(username);
      if (!kickUserId) {
        console.log(`No Kick user ID found for ${username}, skipping 7TV lookup`);
        return null;
      }

      // Fetch 7TV user data
      const response = await axios.get(`${this.SEVENTV_API_BASE}/users/kick/${kickUserId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Referer': 'https://7tv.io/',
          'Origin': 'https://7tv.io'
        },
        timeout: 15000,
        maxRedirects: 5,
        validateStatus: (status) => status < 500,
        ...(this.httpsAgent && { httpsAgent: this.httpsAgent }),
      });

      const cosmetics: SevenTVCosmetics = response.data;
      
      // If user has a paint, try to fetch paint details using GraphQL
      if (cosmetics.user.style.paint_id) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`User ${username} has paint_id: ${cosmetics.user.style.paint_id}`);
        }
        try {
          const paintData = await this.fetchPaintData(cosmetics.user.style.paint_id);
          if (paintData) {
            // Add paint data to cosmetics
            (cosmetics as any).paint = paintData;
            if (process.env.NODE_ENV !== 'production') {
              console.log(`Loaded paint data for ${username}:`, paintData);
            }
          } else {
            if (process.env.NODE_ENV !== 'production') {
              console.log(`No paint data found for ${username}, using base color: ${cosmetics.user.style.color}`);
            }
          }
        } catch (error) {
          if (process.env.NODE_ENV !== 'production') {
            console.log(`Failed to fetch paint data for ${username}:`, error);
          }
        }
      } else {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`User ${username} has no paint_id, using base color: ${cosmetics.user.style.color}`);
        }
      }
      
      // Cache the result
      this.cosmeticsCache.set(username.toLowerCase(), cosmetics);
      
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Loaded 7TV cosmetics for ${username}:`, {
          hasPaint: !!cosmetics.user.style.paint_id,
          color: cosmetics.user.style.color,
          roles: cosmetics.roles.length
        });
      }

      return cosmetics;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          if (process.env.NODE_ENV !== 'production') {
            console.log(`No 7TV account found for ${username}`);
          }
        } else {
          console.error(`Failed to fetch 7TV cosmetics for ${username}:`, {
            status: error.response?.status,
            statusText: error.response?.statusText,
            message: error.message
          });
        }
      } else {
        console.error(`Unexpected error fetching 7TV cosmetics for ${username}:`, error);
      }
      return null;
    }
  }

  private async getKickUserId(username: string): Promise<string | null> {
    try {
      // Add minimal delay between requests to avoid rate limiting
      this.requestCount++;
      if (this.requestCount > 1) {
        await this.delay(200 + Math.random() * 300); // Reduced to 200-500ms delay
      }

      const response = await axios.get(`${this.KICK_API_BASE}/channels/${username}`, {
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'cross-site',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Referer': 'https://kick.com/',
          'Origin': 'https://kick.com',
          'X-Requested-With': 'XMLHttpRequest'
        },
        timeout: 15000,
        maxRedirects: 5,
        validateStatus: (status) => status < 500, // Accept 4xx as valid responses
        ...(this.httpsAgent && { httpsAgent: this.httpsAgent }),
      });

      if (response.status === 403) {
        console.log(`Kick API blocked request for ${username} - skipping 7TV lookup`);
        return null;
      }

      return response.data.user_id?.toString() || null;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403) {
          console.log(`Kick API blocked request for ${username} - skipping 7TV lookup`);
        } else {
          console.error(`Failed to get Kick user ID for ${username}:`, {
            status: error.response?.status,
            statusText: error.response?.statusText,
            message: error.message
          });
        }
      } else {
        console.error(`Unexpected error getting Kick user ID for ${username}:`, error);
      }
      return null;
    }
  }

  // Convert 7TV color number to hex
  colorNumberToHex(colorNumber: number): string {
    // 7TV uses 32-bit color values, convert to hex
    const hex = (colorNumber >>> 0).toString(16).padStart(8, '0');
    return `#${hex.substring(2)}`; // Remove alpha channel
  }

  // Fetch paint data using 7TV GraphQL API
  async fetchPaintData(paintId: string): Promise<any> {
    try {
      console.log(`Fetching paint data via GraphQL for paint ID: ${paintId}`);
      
      const query = `
        query GetPaints {
          cosmetics {
            paints {
              id
              name
              color
              function
              stops {
                at
                color
              }
            }
          }
        }
      `;

      const response = await axios.post('https://7tv.io/v3/gql', {
        query
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': this.getRandomUserAgent(),
          'Origin': 'https://kick.com',
          'Referer': 'https://kick.com/',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        timeout: 10000,
        ...(this.httpsAgent && { httpsAgent: this.httpsAgent }),
      });

      if (response.data && response.data.data && response.data.data.cosmetics && response.data.data.cosmetics.paints) {
        const paint = response.data.data.cosmetics.paints.find((p: any) => p.id === paintId);
        if (paint) {
          console.log(`Found paint data via GraphQL:`, paint);
          return paint;
        }
      }
      
      console.log(`Paint ${paintId} not found in GraphQL response`);
      return null;
    } catch (error) {
      console.error(`Failed to fetch paint data via GraphQL for ${paintId}:`, error);
      return null;
    }
  }

  // Check if user has 7TV cosmetics
  hasCosmetics(cosmetics: SevenTVCosmetics | null): boolean {
    if (!cosmetics) return false;
    
    return !!(
      cosmetics.user.style.paint_id ||
      cosmetics.user.style.badge_id ||
      cosmetics.roles.length > 0
    );
  }

  // Enable/disable 7TV cosmetics
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    console.log(`7TV cosmetics ${enabled ? 'enabled' : 'disabled'}`);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  // Set proxy URL
  setProxy(proxyUrl: string | null): void {
    this.proxyUrl = proxyUrl || undefined;
    if (proxyUrl) {
      this.httpsAgent = new HttpsProxyAgent(proxyUrl);
      console.log(`Proxy set to: ${proxyUrl}`);
    } else {
      this.httpsAgent = undefined;
      console.log('Proxy disabled');
    }
  }

  getProxy(): string | null {
    return this.proxyUrl || null;
  }

  // Clear cache (useful for testing or memory management)
  clearCache(): void {
    this.cosmeticsCache.clear();
    console.log('7TV cosmetics cache cleared');
  }
}
