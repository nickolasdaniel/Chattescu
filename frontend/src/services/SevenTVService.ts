// frontend/src/services/SevenTVService.ts

import { SevenTVCosmetics } from '../types';
import { sevenTVCache } from './SevenTVCache';

export type SevenTVUser = SevenTVCosmetics;

export class FrontendSevenTVService {
  private readonly SEVENTV_API_BASE = 'https://7tv.io/v3';

  async getUserCosmetics(username: string, kickUserId?: string): Promise<SevenTVCosmetics | null> {
    try {
      // If no Kick user ID provided, we can't fetch 7TV data from frontend
      if (!kickUserId) {
        return null;
      }

      // Check cache first
      const cached = sevenTVCache.get('kick', kickUserId);
      if (cached && cached.cosmetics) {
        return cached.cosmetics;
      }

      // Fetch 7TV user data directly using the provided Kick user ID
      const response = await fetch(`${this.SEVENTV_API_BASE}/users/kick/${kickUserId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        mode: 'cors',
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Cache null result to avoid repeated 404s
          sevenTVCache.set('kick', kickUserId, null, null, 60 * 60 * 1000); // 1 hour TTL for 404s
        }
        return null;
      }

      const cosmetics: SevenTVUser = await response.json();
      
      // Cache the result with default TTL
      sevenTVCache.set('kick', kickUserId, cosmetics, null);

      return cosmetics;
    } catch (error) {
      console.error(`Error fetching 7TV cosmetics for ${username}:`, error);
      return null;
    }
  }


  // Convert 7TV color number to hex
  colorNumberToHex(colorNumber: number): string {
    const hex = (colorNumber >>> 0).toString(16).padStart(8, '0');
    return `#${hex.substring(2)}`; // Remove alpha channel
  }

  // Check if user has 7TV cosmetics
  hasCosmetics(cosmetics: SevenTVUser | null): boolean {
    if (!cosmetics) return false;
    
    return !!(
      cosmetics.user.style.paint_id ||
      cosmetics.user.style.badge_id ||
      (cosmetics.roles && cosmetics.roles.length > 0)
    );
  }

  // Fetch paint data with caching
  async fetchPaintData(paintId: string): Promise<any | null> {
    try {
      // Check cache first
      const cached = sevenTVCache.get('paint', paintId);
      if (cached && cached.paintData) {
        return cached.paintData;
      }

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

      const response = await fetch('https://7tv.io/v3/gql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        body: JSON.stringify({
          query
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.errors && data.errors.length > 0) {
        console.error('GraphQL errors:', data.errors);
        return null;
      }
      
      if (data.data && data.data.cosmetics && data.data.cosmetics.paints) {
        const paint = data.data.cosmetics.paints.find((p: any) => p.id === paintId);
        if (paint) {
          // Cache the paint data
          sevenTVCache.set('paint', paintId, null, paint, 24 * 60 * 60 * 1000); // 24 hours TTL
          return paint;
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Failed to fetch paint data for ${paintId}:`, error);
      return null;
    }
  }

  // Clear cache
  clearCache(): void {
    sevenTVCache.clear();
  }

  // Get cache statistics
  getCacheStats(): { size: number; entries: Array<{ key: string; age: number; ttl: number }> } {
    return sevenTVCache.getStats();
  }
}
