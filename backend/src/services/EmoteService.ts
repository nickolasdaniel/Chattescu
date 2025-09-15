// backend/src/services/EmoteService.ts

import axios from 'axios';
import { SevenTVEmote } from '../types';

export class EmoteService {
  private readonly KICK_API_BASE = 'https://kick.com/api/v2';
  private globalEmotesCache: SevenTVEmote[] = [];
  private channelEmotesCache = new Map<string, SevenTVEmote[]>();
  private kickUserIdCache = new Map<string, string>();

  async loadChannelEmotes(channelName: string): Promise<SevenTVEmote[]> {
    try {
      // Load global emotes first (cached)
      await this.loadGlobalEmotes();

      // Load channel-specific emotes
      const channelEmotes = await this.loadChannelSpecificEmotes(channelName);

      // Combine and return all emotes
      const allEmotes = [...this.globalEmotesCache, ...channelEmotes];
      console.log(`Loaded ${allEmotes.length} total emotes for ${channelName} (${this.globalEmotesCache.length} global, ${channelEmotes.length} channel)`);
      
      return allEmotes;
    } catch (error) {
      console.error(`Failed to load emotes for ${channelName}:`, error);
      // Return just global emotes if channel emotes fail
      return this.globalEmotesCache;
    }
  }

  private async loadGlobalEmotes(): Promise<void> {
    // Return cached if already loaded
    if (this.globalEmotesCache.length > 0) {
      return;
    }

    try {
      console.log('Loading 7TV global emotes...');
      const response = await axios.get('https://7tv.io/v3/emote-sets/global');
      const data = response.data;

      this.globalEmotesCache = data.emotes.map((emote: any) => ({
        name: emote.name,
        url: this.buildEmoteUrl(emote.data.host.url, emote.data.animated),
        type: 'global' as const,
        animated: emote.data.animated || false
      }));

      console.log(`Loaded ${this.globalEmotesCache.length} global 7TV emotes`);
    } catch (error) {
      console.error('Failed to load global 7TV emotes:', error);
      this.globalEmotesCache = [];
    }
  }

  private async loadChannelSpecificEmotes(channelName: string): Promise<SevenTVEmote[]> {
    // Check cache first
    const cached = this.channelEmotesCache.get(channelName);
    if (cached) {
      return cached;
    }

    try {
      // Get Kick user ID for the channel
      const kickUserId = await this.getKickUserId(channelName);
      if (!kickUserId) {
        console.log(`No Kick user ID found for ${channelName}`);
        return [];
      }

      // Try to get 7TV data using Kick user ID
      const response = await axios.get(`https://7tv.io/v3/users/kick/${kickUserId}`);
      const data = response.data;

      if (!data.emote_set?.emotes) {
        console.log(`${channelName} has no 7TV emote set`);
        this.channelEmotesCache.set(channelName, []);
        return [];
      }

      const channelEmotes: SevenTVEmote[] = data.emote_set.emotes.map((emote: any) => ({
        name: emote.name,
        url: this.buildEmoteUrl(emote.data.host.url, emote.data.animated),
        type: 'channel' as const,
        animated: emote.data.animated || false
      }));

      // Cache the result
      this.channelEmotesCache.set(channelName, channelEmotes);
      console.log(`Loaded ${channelEmotes.length} channel emotes for ${channelName}`);
      
      return channelEmotes;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        console.log(`${channelName} not linked to 7TV`);
      } else {
        console.error(`Failed to load channel emotes for ${channelName}:`, error);
      }
      
      this.channelEmotesCache.set(channelName, []);
      return [];
    }
  }

  private async getKickUserId(username: string): Promise<string | null> {
    // Check cache first
    const cached = this.kickUserIdCache.get(username);
    if (cached) {
      return cached;
    }

    try {
      const response = await axios.get(`${this.KICK_API_BASE}/channels/${username}`);
      const userId = response.data.user_id || response.data.user?.id;
      
      if (userId) {
        const userIdStr = userId.toString();
        this.kickUserIdCache.set(username, userIdStr);
        return userIdStr;
      }
      
      return null;
    } catch (error) {
      console.error(`Failed to get Kick user ID for ${username}:`, error);
      return null;
    }
  }

  private buildEmoteUrl(hostUrl: string, animated: boolean): string {
    const baseUrl = `https:${hostUrl}`;
    return animated ? `${baseUrl}/1x.gif` : `${baseUrl}/1x.webp`;
  }

  // Parse message content and replace emote names with processed emote data
  parseMessageEmotes(content: string, channelName: string): string {
    let parsedContent = content;
    
    // Get all emotes for this channel
    const globalEmotes = this.globalEmotesCache;
    const channelEmotes = this.channelEmotesCache.get(channelName) || [];
    const allEmotes = [...globalEmotes, ...channelEmotes];

    // Replace emote names with HTML
    allEmotes.forEach(emote => {
      const regex = new RegExp(`\\b${this.escapeRegExp(emote.name)}\\b`, 'g');
      const emoteClass = `emote seventv-emote ${emote.type}-emote ${emote.animated ? 'animated' : 'static'}`;
      const emoteHtml = `<img src="${emote.url}" class="${emoteClass}" alt="${emote.name}" title="${emote.name} (7TV ${emote.type})" loading="lazy">`;
      
      parsedContent = parsedContent.replace(regex, emoteHtml);
    });

    return parsedContent;
  }

  // Handle Kick native emotes with [emote:id:name] format
  parseKickEmotes(content: string): string {
    const emoteRegex = /\[emote:(\d+):(\w+)\]/g;
    
    return content.replace(emoteRegex, (match, emoteId, emoteName) => {
      const emoteUrl = `https://files.kick.com/emotes/${emoteId}/fullsize`;
      return `<img src="${emoteUrl}" class="emote kick-emote" alt="${emoteName}" title="${emoteName}" loading="lazy">`;
    });
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Get all emotes for a channel (useful for frontend)
  getAllEmotesForChannel(channelName: string): SevenTVEmote[] {
    const channelEmotes = this.channelEmotesCache.get(channelName) || [];
    return [...this.globalEmotesCache, ...channelEmotes];
  }

  // Clear specific channel cache
  clearChannelCache(channelName: string): void {
    this.channelEmotesCache.delete(channelName);
    this.kickUserIdCache.delete(channelName);
  }

  // Clear all caches
  clearAllCaches(): void {
    this.globalEmotesCache = [];
    this.channelEmotesCache.clear();
    this.kickUserIdCache.clear();
    console.log('All emote caches cleared');
  }

  // Get cache stats (useful for monitoring)
  getCacheStats(): { globalEmotes: number; channelCaches: number; userIdCaches: number } {
    return {
      globalEmotes: this.globalEmotesCache.length,
      channelCaches: this.channelEmotesCache.size,
      userIdCaches: this.kickUserIdCache.size
    };
  }
}