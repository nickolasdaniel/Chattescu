// frontend/src/services/SevenTVCache.ts

import { SevenTVCosmetics } from '../types';

interface CacheEntry {
  cosmetics: SevenTVCosmetics | null;
  paintData: any | null;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class SevenTVCache {
  private cache = new Map<string, CacheEntry>();
  private readonly DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start cleanup interval to remove expired entries
    this.startCleanup();
  }

  // Generate cache key from platform and user ID
  private getCacheKey(platform: string, userId: string): string {
    return `${platform.toLowerCase()}_${userId}`;
  }

  // Set cache entry
  set(platform: string, userId: string, cosmetics: SevenTVCosmetics | null, paintData: any | null, ttl?: number): void {
    const key = this.getCacheKey(platform, userId);
    const entry: CacheEntry = {
      cosmetics,
      paintData,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_TTL
    };
    
    this.cache.set(key, entry);
  }

  // Get cache entry
  get(platform: string, userId: string): { cosmetics: SevenTVCosmetics | null; paintData: any | null } | null {
    const key = this.getCacheKey(platform, userId);
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return {
      cosmetics: entry.cosmetics,
      paintData: entry.paintData
    };
  }

  // Check if entry exists and is valid
  has(platform: string, userId: string): boolean {
    const key = this.getCacheKey(platform, userId);
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  // Remove specific entry
  delete(platform: string, userId: string): boolean {
    const key = this.getCacheKey(platform, userId);
    return this.cache.delete(key);
  }

  // Clear all entries
  clear(): void {
    this.cache.clear();
  }

  // Get cache statistics
  getStats(): { size: number; entries: Array<{ key: string; age: number; ttl: number }> } {
    const now = Date.now();
    const entries: Array<{ key: string; age: number; ttl: number }> = [];

    // Use forEach instead of Array.from to avoid downlevelIteration issues
    this.cache.forEach((entry, key) => {
      entries.push({
        key,
        age: now - entry.timestamp,
        ttl: entry.ttl
      });
    });

    return {
      size: this.cache.size,
      entries
    };
  }

  // Start cleanup interval (runs every 5 minutes)
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000); // 5 minutes
  }

  // Clean up expired entries
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    // Use forEach instead of for...of to avoid downlevelIteration issues
    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      console.log(`SevenTV Cache: Cleaned up ${cleanedCount} expired entries`);
    }
  }

  // Stop cleanup interval (for cleanup)
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Export singleton instance
export const sevenTVCache = new SevenTVCache();
