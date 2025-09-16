// backend/src/services/KickChatService.ts

import WebSocket from 'ws';
import axios from 'axios';
import { EventEmitter } from 'events';
import { ChatMessage, ChannelInfo, ChatUser, SevenTVCosmetics } from '../types';
import { SevenTVService } from './SevenTVService';
import { BrowserService } from './BrowserService';
import { BadgeService } from './BadgeService';

interface KickMessageData {
  sender: {
    id: string;
    username: string;
    identity: {
      color?: string;
      badges: Array<{
        type: string;
        text: string;
        count?: number;
      }>;
    };
  };
  content: string;
  created_at: string;
  emotes?: Array<{
    id: string;
    name: string;
    source: string;
    position?: number;
  }>;
}

export class KickChatService extends EventEmitter {
  private readonly KICK_API_BASE = 'https://kick.com/api/v2';
  private readonly PUSHER_APP_KEY = '32cbd69e4b950bf97679';
  private readonly PUSHER_CLUSTER = 'us2';
  
  private ws: WebSocket | null = null;
  private currentChannel: string | null = null;
  private isConnected = false;
  private sevenTVService: SevenTVService;
  private browserService: BrowserService;
  private badgeService: BadgeService;
  private chatroomIdLookup: ((channelName: string) => string | null) | null = null;
  private channelIdLookup: ((channelName: string) => string | null) | null = null;

  constructor() {
    super();
    this.sevenTVService = new SevenTVService();
    this.browserService = new BrowserService();
    this.badgeService = new BadgeService();
  }

  setChatroomIdLookup(lookup: (channelName: string) => string | null): void {
    this.chatroomIdLookup = lookup;
  }

  setChannelIdLookup(lookup: (channelName: string) => string | null): void {
    this.channelIdLookup = lookup;
  }

  // Method to subscribe with correct channels once we have the real IDs from frontend
  async subscribeToChannels(channelName: string): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.log(`❌ WebSocket not connected, cannot subscribe for ${channelName}`);
      return;
    }

    // Get the real IDs from frontend cache
    let chatroomId: string | null = null;
    let channelId: string | null = null;
    
    if (this.chatroomIdLookup) {
      chatroomId = this.chatroomIdLookup(channelName);
    }
    if (this.channelIdLookup) {
      channelId = this.channelIdLookup(channelName);
    }

    if (!chatroomId || !channelId) {
      console.log(`❌ Missing IDs for subscription: chatroom=${chatroomId}, channel=${channelId}`);
      return;
    }

    console.log(`🎯 Subscribing with correct IDs for ${channelName}: chatroom=${chatroomId}, channel=${channelId}`);

    // Subscribe to EXACT patterns from network tab analysis
    const correctChannels = [
      `chatroom_${chatroomId}`,           // chatroom_4110233
      `chatrooms.${chatroomId}.v2`,       // chatrooms.4110233.v2  
      `chatrooms.${chatroomId}`,          // chatrooms.4110233
      `channel_${channelId}`,             // channel_4121749
      `channel.${channelId}`,             // channel.4121749
      `predictions-channel-${channelId}`  // predictions-channel-4121749
    ];

    console.log(`📡 Subscribing to ${correctChannels.length} channels for ${channelName}:`, correctChannels);

    // Subscribe to each channel
    correctChannels.forEach((channel, index) => {
      setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          const subscribeMessage = {
            event: 'pusher:subscribe',
            data: { channel }
          };
          console.log(`🎯 [${index + 1}/${correctChannels.length}] Subscribing to: ${channel}`);
          this.ws.send(JSON.stringify(subscribeMessage));
        }
      }, index * 200); // Faster intervals since we know these are correct
    });
  }

  private async getChatroomId(channelName: string): Promise<string> {
    console.log(`Fetching chatroom ID for channel: ${channelName}`);
    
    // Option 1: Check if frontend already provided the chatroom ID
    if (this.chatroomIdLookup) {
      const cachedId = this.chatroomIdLookup(channelName);
      if (cachedId) {
        console.log(`🎉 Using cached chatroom ID from frontend: ${cachedId}`);
        return cachedId;
      } else {
        console.log(`💭 No cached chatroom ID found for ${channelName}, frontend hasn't sent badge data yet`);
      }
    }

    // Option 2: Try BadgeService directly as fallback
    try {
      console.log(`🏷️ Using BadgeService directly for ${channelName}`);
      const channelInfo = await this.badgeService.loadChannelBadges(channelName);
      
      if (channelInfo.chatroom?.id) {
        console.log(`🎉 Found chatroom ID via BadgeService: ${channelInfo.chatroom.id}`);
        console.log(`📊 Channel info:`, {
          channelId: channelInfo.id,
          chatroomId: channelInfo.chatroom.id,
          username: channelInfo.username,
          badgeCount: channelInfo.subscriber_badges.length
        });
        return channelInfo.chatroom.id;
      } else {
        console.log(`⚠️ BadgeService didn't return chatroom ID`);
      }
    } catch (error) {
      console.log(`❌ BadgeService failed for ${channelName}:`, error);
    }

    // All methods failed - return fallback
    console.log(`❌ All chatroom ID methods failed for ${channelName}`);
    console.log(`🔄 Using fallback chatroom ID for WebSocket subscription`);
    return `fallback_${channelName.toLowerCase()}`;
  }

  private async retryWithSession(channelName: string, cookies: string): Promise<string> {
    try {
      console.log(`🔄 Retrying chatroom API with session cookies for ${channelName}`);
      
      const response = await fetch(`https://kick.com/api/v2/channels/${channelName}/chatroom`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br, zstd',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'DNT': '1',
          'Origin': 'https://kick.com',
          'Referer': `https://kick.com/${channelName}`,
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin',
          'X-Requested-With': 'XMLHttpRequest',
          'Cookie': cookies,
          'Pragma': 'no-cache'
        }
      });

      if (response.ok) {
        const data = await response.json() as { id: number };
        console.log(`🎉 Successfully fetched chatroom data with session:`, data);
        
        if (data.id) {
          console.log(`✨ Found chatroom ID with session for ${channelName}: ${data.id}`);
          return data.id.toString();
        }
      } else {
        console.log(`❌ Session retry failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.log(`❌ Session retry error:`, error);
    }

    // If session retry fails, fall back to HTML scraping
    return await this.getFallbackChatroomId(channelName);
  }

  private async getFallbackChatroomId(channelName: string): Promise<string> {
    // Try to get chatroom ID through alternative methods
    console.log(`Using fallback chatroom ID approach for ${channelName}`);
    
    // Skip hardcoded IDs - we want to test if HTML scraping actually works
    console.log(`🔍 Attempting to discover chatroom ID for ${channelName} via HTML scraping`);
    // No hardcoded fallbacks - let's see if we can actually extract it
    
    // For now, let's try to use a different approach - maybe we can extract it from the channel page
    // or use a known working pattern
    return await this.tryAlternativeChatroomIdFetch(channelName);
  }

  private async tryAlternativeChatroomIdFetch(channelName: string): Promise<string> {
    try {
      // Try to fetch the channel page HTML and extract chatroom ID from there
      console.log(`Trying HTML scraping method to get chatroom ID for ${channelName}`);
      
      const response = await fetch(`https://kick.com/${channelName}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (response.ok) {
        const html = await response.text();
        console.log(`✅ Successfully fetched HTML for ${channelName}: ${html.length} characters`);
        
        // Enhanced patterns to extract chatroom ID from various formats
        const patterns = [
          // Look for chatroom object with id
          /"chatroom":\s*{\s*[^}]*"id":\s*(\d+)/i,
          // Direct chatroom_id reference
          /"chatroom_id":\s*(\d+)/i,
          // Pusher channel patterns
          /chatrooms\.(\d+)\.v2/i,
          /chatroom_(\d+)/i,
          // Window data patterns
          /window\.__INITIAL_STATE__.*?"chatroom":\s*{\s*[^}]*"id":\s*(\d+)/i,
          // JSON data patterns
          /"data-chatroom-id":\s*"(\d+)"/i,
          // Meta tag patterns
          /<meta[^>]*chatroom[^>]*content="(\d+)"/i,
          // Script tag patterns
          /chatroomId["\s]*[:=]["\s]*(\d+)/i,
          // Broad numeric patterns (8+ digits to avoid false positives)
          /"id":\s*(\d{8,})/g
        ];

        for (const pattern of patterns) {
          // Handle the global pattern separately
          if (pattern.source === '"id":\\s*(\\d{8,})' && pattern.global) {
            const allMatches = Array.from(html.matchAll(new RegExp(pattern.source, 'gi')));
            if (allMatches.length > 0) {
              console.log(`🔍 Found ${allMatches.length} potential chatroom IDs:`, allMatches.map(m => m[1]));
              
              // Filter for reasonable chatroom IDs (8+ digits)
              const validIds = allMatches
                .map(m => m[1])
                .filter(id => id && id.length >= 8 && parseInt(id) > 10000000);
              
              if (validIds.length > 0 && validIds[0]) {
                console.log(`✨ Found valid chatroom ID for ${channelName}: ${validIds[0]}`);
                return validIds[0];
              }
            }
          } else {
            const matches = html.match(pattern);
            if (matches && matches[1]) {
              const chatroomId = matches[1];
              if (chatroomId && chatroomId.length >= 6) {
                console.log(`✨ Found chatroom ID in HTML for ${channelName}: ${chatroomId} (pattern: ${pattern})`);
                return chatroomId;
              }
            }
          }
        }

        // Try to find Pusher subscription patterns in script tags
        const pusherPattern = /pusher.*subscribe.*chatroom[s]?[._](\d+)/gi;
        const pusherMatches = Array.from(html.matchAll(pusherPattern));
        if (pusherMatches.length > 0 && pusherMatches[0] && pusherMatches[0][1]) {
          const chatroomId = pusherMatches[0][1];
          console.log(`✨ Found chatroom ID via Pusher pattern for ${channelName}: ${chatroomId}`);
          return chatroomId;
        }

        // More comprehensive search in script tags
        const scriptTags = html.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || [];
        console.log(`📄 Found ${scriptTags.length} script tags in HTML`);
        
        // Look for any script that contains chatroom data
        for (let i = 0; i < scriptTags.length; i++) {
          const script = scriptTags[i];
          if (script && (script.includes('chatroom') || script.includes('Chatroom') || script.includes('pusher') || script.includes('Pusher'))) {
            console.log(`🔍 Script ${i} contains relevant reference (${script.length} chars)`);
            
            // Try to extract chatroom ID from this specific script
            const scriptPatterns = [
              /"chatroom":\s*{\s*[^}]*"id":\s*(\d+)/i,
              /"chatroom_id":\s*(\d+)/i,
              /chatrooms\.(\d+)\.v2/i,
              /chatroom_(\d+)/i,
              /"id":\s*(\d{8,})/g
            ];
            
            for (const pattern of scriptPatterns) {
              if (pattern.global) {
                const allMatches = Array.from(script.matchAll(new RegExp(pattern.source, 'gi')));
                if (allMatches.length > 0) {
                  const validIds = allMatches
                    .map(m => m[1])
                    .filter(id => id && id.length >= 8 && parseInt(id) > 10000000);
                  
                  if (validIds.length > 0 && validIds[0]) {
                    console.log(`✨ Found chatroom ID in script ${i}: ${validIds[0]}`);
                    return validIds[0];
                  }
                }
              } else {
                const match = script.match(pattern);
                if (match && match[1] && match[1].length >= 6) {
                  console.log(`✨ Found chatroom ID in script ${i}: ${match[1]}`);
                  return match[1];
                }
              }
            }
            
            // Show a sample of the script for debugging
            const sample = script.substring(0, 800) + '...';
            console.log(`📝 Script ${i} sample:`, sample);
          }
        }
        
        // Also check for window.__INITIAL_STATE__ or similar global variables
        const windowStatePattern = /window\.__\w+__\s*=\s*({[\s\S]*?});/gi;
        const windowStateMatches = Array.from(html.matchAll(windowStatePattern));
        
        for (let i = 0; i < windowStateMatches.length; i++) {
          const match = windowStateMatches[i];
          if (match && match[1]) {
            const stateData = match[1];
            if (stateData.includes('chatroom')) {
              console.log(`🔍 Found window state data with chatroom reference`);
              const chatroomMatch = stateData.match(/"chatroom":\s*{\s*[^}]*"id":\s*(\d+)/i);
              if (chatroomMatch && chatroomMatch[1]) {
                console.log(`✨ Found chatroom ID in window state: ${chatroomMatch[1]}`);
                return chatroomMatch[1];
              }
            }
          }
        }
      } else {
        console.log(`❌ Failed to fetch HTML for ${channelName}: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.log(`❌ HTML scraping failed for ${channelName}:`, error);
    }
    
    // If all else fails, return a fallback that might work
    console.log(`🔄 Using generic fallback for ${channelName}`);
    return `fallback_${channelName.toLowerCase()}`;
  }

  // Event handler methods for ChatController
  onMessage(callback: (message: ChatMessage) => void): void {
    this.on('message', callback);
  }

  onChannelConnected(callback: (channelInfo: ChannelInfo) => void): void {
    this.on('channelConnected', callback);
  }

  onError(callback: (error: string) => void): void {
    this.on('error', callback);
  }

  async connectToChannel(channelName: string): Promise<void> {
    try {
      console.log(`Attempting to connect to ${channelName} using Pusher WebSocket...`);
      
      const fallbackChannelInfo: ChannelInfo = {
        id: 'fallback',
        slug: channelName.toLowerCase(),
        username: channelName,
        chatroom: {
          id: 'unknown',
          channel_id: 'unknown'
        },
        subscriber_badges: []
      };

      // Disconnect from previous channel if connected
      if (this.ws) {
        this.disconnect();
      }

      // Connect using the Pusher approach that works
      await this.connectToPusherWebSocket(channelName);
      
      this.currentChannel = channelName;
      this.emit('channelConnected', fallbackChannelInfo);
      
      console.log(`Connected to Kick chat: ${channelName}`);
    } catch (error) {
      console.error(`Failed to connect to channel ${channelName}:`, error);
      this.emit('error', `Failed to connect to ${channelName}`);
      throw error;
    }
  }

  private async connectToPusherWebSocket(channelName: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const wsUrl = `wss://ws-${this.PUSHER_CLUSTER}.pusher.com/app/${this.PUSHER_APP_KEY}?protocol=7&client=js&version=4.3.1&flash=false`;
      
      console.log(`Connecting to Pusher WebSocket: ${wsUrl}`);
      
      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', async () => {
        console.log('WebSocket connected to Pusher');
        console.log(`⏳ Waiting for frontend to provide chatroom and channel IDs for ${channelName}...`);
        
        // Don't subscribe immediately - wait for the frontend data
        // The subscription will be triggered by ChatController when badge data arrives
        resolve();
      });

      this.ws.on('message', async (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          console.log('Received WebSocket message:', JSON.stringify(message, null, 2));
          
          if (message.event === 'pusher:connection_established') {
            console.log('Pusher connection established');
          }
          
          if (message.event === 'pusher:subscription_succeeded') {
            console.log(`✅ Successfully subscribed to channel: ${message.channel}`);
            this.isConnected = true;
            // Don't resolve here, wait for actual messages
          }
          
          if (message.event === 'pusher:subscription_error') {
            console.log(`❌ Failed to subscribe to channel: ${message.channel}`);
            console.log('❌ Error details:', JSON.stringify(message, null, 2));
          }

          // Handle chat messages - try multiple possible event names
          const possibleChatEvents = [
            'App\\Events\\ChatMessageEvent',
            'ChatMessageEvent',
            'chat_message',
            'message',
            'chatroom_message',
            'App\\Events\\ChatMessage',
            'App\\Events\\MessageEvent'
          ];

          if (possibleChatEvents.includes(message.event)) {
            console.log(`🎉 Received chat message event: ${message.event}`);
            try {
              const messageData: KickMessageData = JSON.parse(message.data);
              console.log('Chat message data:', messageData);
              const chatMessage = await this.transformKickMessage(messageData);
              this.emit('message', chatMessage);
            } catch (error) {
              console.error('Error processing chat message:', error);
            }
          }

          // Log ANY event that might be related to chat/messages for debugging
          if (message.event && (
            message.event.toLowerCase().includes('chat') || 
            message.event.toLowerCase().includes('message') ||
            message.event.toLowerCase().includes('msg')
          )) {
            console.log(`🔍 POTENTIAL CHAT EVENT DETECTED: ${message.event}`);
            console.log('🔍 Channel:', message.channel);
            console.log('🔍 Event data:', JSON.stringify(message.data, null, 2));
          }

          // Log all non-pusher events for debugging
          if (message.event && !message.event.startsWith('pusher')) {
            console.log(`🚀 NON-PUSHER EVENT: ${message.event}`);
            console.log('🚀 Channel:', message.channel);
            console.log('🚀 Data:', JSON.stringify(message.data, null, 2));
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          console.log('Raw message data:', data.toString());
        }
      });

      this.ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.isConnected = false;
        reject(error);
      });

      this.ws.on('close', (code, reason) => {
        console.log(`WebSocket connection closed: ${code} - ${reason}`);
        this.isConnected = false;
        this.ws = null;
      });

      // Give more time and resolve even if no channels work (so we can see the logs)
      setTimeout(() => {
        if (!this.isConnected) {
          console.log('WebSocket connected but no chat channels worked');
          console.log('Check the logs above to see which channel subscriptions failed');
          // Resolve anyway so we can see what happened
          resolve();
        }
      }, 10000);
    });
  }

  private async transformKickMessage(kickMessage: KickMessageData): Promise<ChatMessage> {
    // Try to fetch 7TV cosmetics for the user (non-blocking)
    let cosmetics: SevenTVCosmetics | null = null;
    try {
      cosmetics = await this.sevenTVService.getUserCosmetics(kickMessage.sender.username);
    } catch (error) {
      // Silently fail - 7TV cosmetics are optional
      console.log(`7TV cosmetics lookup failed for ${kickMessage.sender.username}, continuing without cosmetics`);
    }
    
    const user: ChatUser = {
      id: kickMessage.sender.id.toString(),
      username: kickMessage.sender.username,
      identity: {
        ...(kickMessage.sender.identity.color && { color: kickMessage.sender.identity.color }),
        badges: kickMessage.sender.identity.badges || []
      },
      ...(cosmetics && { cosmetics })
    };

    // Transform badges from user identity
    const badges = (kickMessage.sender.identity.badges || []).map(badge => {
      console.log(`Processing badge:`, { type: badge.type, text: badge.text, count: badge.count });
      
      // For subscriber badges, we'll let the ChatController handle custom badge lookup
      if (badge.type === 'subscriber') {
        return {
          type: badge.type,
          image: this.getSimpleBadgeImage(badge.type), // Default fallback
          alt: badge.text || badge.type,
          isCustom: false, // Will be updated by ChatController if custom badge found
          ...(badge.count !== undefined && { count: badge.count })
        };
      }
      
      return {
        type: badge.type,
        image: this.getSimpleBadgeImage(badge.type),
        alt: badge.text || badge.type,
        isCustom: false,
        ...(badge.count !== undefined && { count: badge.count })
      };
    });

    // Transform Kick emotes to our Emote format
    const emotes = (kickMessage.emotes || []).map(emote => ({
      id: emote.id,
      name: emote.name,
      source: emote.source,
      type: 'kick' as const,
      ...(emote.position !== undefined && { position: emote.position })
    }));

    return {
      id: `${Date.now()}-${Math.random()}`,
      username: kickMessage.sender.username,
      content: kickMessage.content,
      timestamp: new Date(kickMessage.created_at),
      badges,
      emotes,
      user
    };
  }

  private getSimpleBadgeImage(badgeType: string): string {
    // First try to get SVG badge
    const svgBadge = this.getKickBadgeSVG(badgeType);
    if (svgBadge) {
      return svgBadge;
    }

    // Fallback to emojis
    const badgeEmojis: Record<string, string> = {
      'moderator': '🛡️',
      'vip': '💎',
      'subscriber': '⭐',
      'verified': '✅',
      'founder': '🏆',
      'og': '🔥',
      'broadcaster': '👑',
      'staff': '⚡',
      'admin': '🔧',
      'sub_gifter': '🎁'
    };
    return badgeEmojis[badgeType] || '🎖️';
  }

  private getKickBadgeSVG(badgeType: string): string | null {
    console.log(`Looking up SVG for badge type: ${badgeType}`);
    
    const svgBadges: Record<string, string> = {
      'moderator': `<svg width="16" height="16" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle;">
                <defs>
                    <linearGradient id="moderator_gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#4A90E2;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#2E5C8A;stop-opacity:1" />
                    </linearGradient>
                </defs>
                <path d="M30 0C31.1046 0 32 0.895431 32 2V30C32 31.1046 31.1046 32 30 32H2C0.895431 32 0 31.1046 0 30V2C0 0.895431 0.895431 0 2 0H30ZM16.2197 2.99316C15.8292 2.60266 15.1962 2.60265 14.8057 2.99316L8.36328 9.43555C7.97294 9.82608 7.97284 10.4591 8.36328 10.8496L10.0918 12.5781C10.4823 12.9686 11.1153 12.9685 11.5059 12.5781L11.585 12.499L13.9414 14.8564L3.57129 25.2275C2.70357 26.0954 2.7035 27.5023 3.57129 28.3701C4.43911 29.2376 5.84612 29.2377 6.71387 28.3701L17.084 17.999L19.4414 20.3564L19.3633 20.4346C18.9728 20.8251 18.9728 21.4581 19.3633 21.8486L21.0918 23.5771C21.4823 23.9676 22.1154 23.9676 22.5059 23.5771L28.9482 17.1348C29.3386 16.7443 29.3386 16.1112 28.9482 15.7207L27.2197 13.9922C26.8293 13.6017 26.1962 13.6018 25.8057 13.9922L25.7266 14.0703L23.3701 11.7139C24.2377 10.8461 24.2376 9.4391 23.3701 8.57129C22.5023 7.7035 21.0954 7.70357 20.2275 8.57129L17.8701 6.21387L17.9482 6.13574C18.3388 5.74522 18.3388 5.11221 17.9482 4.72168L16.2197 2.99316Z" fill="url(#moderator_gradient)"></path>
            </svg>`,
        'broadcaster': `<svg width="16" height="16" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle;">
                <defs>
                    <linearGradient id="broadcaster_gradient_1" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                        <stop stop-color="#FF1CD2"/>
                        <stop offset="1" stop-color="#B20DFF"/>
                    </linearGradient>
                    <linearGradient id="broadcaster_gradient_2" x1="0" y1="0" x2="4.72839" y2="35.6202" gradientUnits="userSpaceOnUse">
                        <stop stop-color="#FF1CD2"/>
                        <stop offset="1" stop-color="#B20DFF"/>
                    </linearGradient>
                </defs>
                <path d="M15.6773 22.1533C17.3698 22.1533 18.8182 21.5507 20.0233 20.3461C21.2282 19.1415 21.8307 17.6924 21.8307 16V6.15401C21.8307 4.46162 21.2286 3.01305 20.0233 1.80784C18.8182 0.602907 17.3698 0 15.6773 0C13.9849 0 12.5363 0.602907 11.3311 1.80784C10.1259 3.01285 9.52344 4.46162 9.52344 6.15401V16C9.52344 17.6923 10.1262 19.1415 11.3311 20.3461C12.5361 21.5507 13.9849 22.1533 15.6773 22.1533Z" fill="url(#broadcaster_gradient_1)"/>
                <path d="M15.6773 22.1533C17.3698 22.1533 18.8182 21.5507 20.0233 20.3461C21.2282 19.1415 21.8307 17.6924 21.8307 16V6.15401C21.8307 4.46162 21.2286 3.01305 20.0233 1.80784C18.8182 0.602907 17.3698 0 15.6773 0C13.9849 0 12.5363 0.602907 11.3311 1.80784C10.1259 3.01285 9.52344 4.46162 9.52344 6.15401V16C9.52344 17.6923 10.1262 19.1415 11.3311 20.3461C12.5361 21.5507 13.9849 22.1533 15.6773 22.1533Z" fill="white" fill-opacity="0.3"/>
                <path d="M26.3888 12.6731C26.1459 12.4295 25.8568 12.3076 25.5234 12.3076C25.1904 12.3076 24.902 12.4295 24.6581 12.6731C24.4147 12.9167 24.293 13.2051 24.293 13.5383V16C24.293 18.3718 23.4498 20.4006 21.7639 22.0864C20.0785 23.7723 18.0495 24.6153 15.6775 24.6153C13.3057 24.6153 11.2769 23.7723 9.59089 22.0864C7.90509 20.401 7.06226 18.3719 7.06226 16V13.5383C7.06226 13.2051 6.94041 12.9167 6.69692 12.6731C6.45329 12.4295 6.16514 12.3076 5.83159 12.3076C5.49804 12.3076 5.20956 12.4295 4.96606 12.6731C4.72237 12.9167 4.60059 13.2051 4.60059 13.5383V16C4.60059 18.8333 5.54627 21.2981 7.4371 23.3941C9.32799 25.4901 11.6645 26.6919 14.4467 26.9994V29.5381H9.52373C9.19038 29.5381 8.90196 29.6601 8.6584 29.9037C8.41477 30.1472 8.29293 30.4357 8.29293 30.7691C8.29293 31.1019 8.41477 31.391 8.6584 31.6344C8.90196 31.8778 9.19038 32 9.52373 32H21.831C22.1643 32 22.4531 31.8779 22.6963 31.6344C22.9402 31.391 23.0622 31.1019 23.0622 30.7691C23.0622 30.4358 22.9402 30.1472 22.6963 29.9037C22.4532 29.6601 22.1644 29.5381 21.831 29.5381H16.9086V26.9994C19.6904 26.6919 22.0267 25.4901 23.9178 23.3941C25.8089 21.2981 26.7548 18.8333 26.7548 16V13.5383C26.7548 13.2051 26.6327 12.9169 26.3888 12.6731Z" fill="url(#broadcaster_gradient_2)"/>
            </svg>`,
        'vip': `<svg width="16" height="16" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle;">
                <defs>
                    <linearGradient id="vip_gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#FFD700;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#FFA500;stop-opacity:1" />
                    </linearGradient>
                </defs>
                <path d="M30 0C31.1046 0 32 0.895431 32 2V30C32 31.1046 31.1046 32 30 32H2C0.895431 32 0 31.1046 0 30V2C0 0.895431 0.895431 4.10637e-08 2 0H30ZM15.9648 5C15.7748 5.00005 15.588 5.05204 15.4238 5.15039C15.2596 5.24878 15.124 5.39057 15.0303 5.56055L9.82812 15.0176L3.55078 11.8906C3.36913 11.7985 3.16534 11.7607 2.96387 11.7822C2.76241 11.8038 2.57048 11.8842 2.41113 12.0127C2.25235 12.1408 2.13185 12.3126 2.06348 12.5078C1.99511 12.7031 1.98143 12.9144 2.02441 13.1172L4.58301 25.127C4.63544 25.3782 4.77165 25.6034 4.96777 25.7627C5.16376 25.9217 5.40762 26.0056 5.65723 26H26.251C26.5009 26.0057 26.7453 25.9219 26.9414 25.7627C27.1376 25.6034 27.2737 25.3782 27.3262 25.127L29.9697 13.1172C30.0187 12.9103 30.0086 12.6932 29.9404 12.4922C29.8722 12.2912 29.7485 12.1151 29.585 11.9844C29.4215 11.8537 29.2249 11.7743 29.0186 11.7559C28.8122 11.7374 28.6049 11.7802 28.4219 11.8799L22.1025 15.0283L16.9004 5.56055C16.8066 5.39054 16.6701 5.24878 16.5059 5.15039C16.3416 5.05207 16.1549 5 15.9648 5Z" fill="url(#vip_gradient)"></path>
            </svg>`,
        'sub_gifter': `<svg width="16" height="16" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle;">
                <path d="M30 18H2V32H30V18Z" fill="#FFD899"></path>
                <path d="M30 8H2V14H30V8Z" fill="#FFD899"></path>
                <path d="M10 8H12.5V14H4V18H12.5V32H19.5V18H28V14H19.5V8H22L26 2H18L16 5L14 2H6L10 8Z" fill="#FF9D00"></path>
            </svg>`,
        'og': `<svg width="16" height="16" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle;">
                <defs>
                    <linearGradient id="og_gradient_1" x1="23.9622" y1="0.695162" x2="24.4274" y2="31.9986" gradientUnits="userSpaceOnUse">
                        <stop stop-color="#00FFF2"/>
                        <stop offset="1" stop-color="#006399"/>
                    </linearGradient>
                    <linearGradient id="og_gradient_2" x1="7.77104" y1="0" x2="7.91062" y2="32.567" gradientUnits="userSpaceOnUse">
                        <stop stop-color="#00FFF2"/>
                        <stop offset="1" stop-color="#006399"/>
                    </linearGradient>
                </defs>
                <g clip-path="url(#og_clip)">
                    <path d="M22.8226 17.2693V28.0037C22.8226 28.2177 22.8929 28.383 23.0336 28.4996C23.1742 28.5969 23.3969 28.6455 23.7017 28.6455H24.5104V32H21.838C19.9627 32 18.6265 31.6694 17.8294 31.0082C17.0559 30.347 16.6691 29.472 16.6691 28.383V16.8901C16.6691 15.8011 17.0559 14.926 17.8294 14.2648C18.6265 13.6036 19.9627 13.273 21.838 13.273H24.6511V16.6276H23.7017C23.3969 16.6276 23.1742 16.6859 23.0336 16.8026C22.8929 16.8998 22.8226 17.0554 22.8226 17.2693ZM32.0002 21.6447V24.8826H24.0885V21.6447H32.0002ZM25.8466 19.6904V17.2693C25.8466 17.0554 25.7763 16.8998 25.6357 16.8026C25.495 16.6859 25.2723 16.6276 24.9676 16.6276H24.0182V13.273H26.8312C28.7066 13.273 30.031 13.6036 30.8046 14.2648C31.6017 14.926 32.0002 15.8011 32.0002 16.8901V19.6904H25.8466ZM25.8466 28.0037V23.8908H32.0002V28.383C32.0002 29.472 31.6017 30.347 30.8046 31.0082C30.031 31.6694 28.7066 32 26.8312 32H24.1588V28.6455H24.9676C25.2723 28.6455 25.495 28.5969 25.6357 28.4996C25.7763 28.383 25.8466 28.2177 25.8466 28.0037Z" fill="white"/>
                    <path d="M22.8226 17.2693V28.0037C22.8226 28.2177 22.8929 28.383 23.0336 28.4996C23.1742 28.5969 23.3969 28.6455 23.7017 28.6455H24.5104V32H21.838C19.9627 32 18.6265 31.6694 17.8294 31.0082C17.0559 30.347 16.6691 29.472 16.6691 28.383V16.8901C16.6691 15.8011 17.0559 14.926 17.8294 14.2648C18.6265 13.6036 19.9627 13.273 21.838 13.273H24.6511V16.6276H23.7017C23.3969 16.6276 23.1742 16.6859 23.0336 16.8026C22.8929 16.8998 22.8226 17.0554 22.8226 17.2693ZM32.0002 21.6447V24.8826H24.0885V21.6447H32.0002ZM25.8466 19.6904V17.2693C25.8466 17.0554 25.7763 16.8998 25.6357 16.8026C25.495 16.6859 25.2723 16.6276 24.9676 16.6276H24.0182V13.273H26.8312C28.7066 13.273 30.031 13.6036 30.8046 14.2648C31.6017 14.926 32.0002 15.8011 32.0002 16.8901V19.6904H25.8466ZM25.8466 28.0037V23.8908H32.0002V28.383C32.0002 29.472 31.6017 30.347 30.8046 31.0082C30.031 31.6694 28.7066 32 26.8312 32H24.1588V28.6455H24.9676C25.2723 28.6455 25.495 28.5969 25.6357 28.4996C25.7763 28.383 25.8466 28.2177 25.8466 28.0037Z" fill="url(#og_gradient_1)"/>
                    <path d="M22.8228 3.99625V14.7307C22.8228 14.9446 22.8931 15.1099 23.0338 15.2266C23.1744 15.3238 23.3971 15.3724 23.7019 15.3724H24.5106V18.727H21.8382C19.9629 18.727 18.6267 18.3964 17.8296 17.7352C17.056 17.074 16.6693 16.1989 16.6693 15.1099V3.61704C16.6693 2.52804 17.056 1.65295 17.8296 0.99177C18.6267 0.33059 19.9629 0 21.8382 0H24.6513V3.35452H23.7019C23.3971 3.35452 23.1744 3.41286 23.0338 3.52953C22.8931 3.62677 22.8228 3.78234 22.8228 3.99625ZM32.0004 8.37171V11.6095H24.0887V8.37171H32.0004ZM25.8468 6.41734V3.99625C25.8468 3.78234 25.7765 3.62677 25.6358 3.52953C25.4952 3.41286 25.2725 3.35452 24.9677 3.35452H24.0183V0H26.8314C28.7067 0 30.0312 0.33059 30.8048 0.99177C31.6018 1.65295 32.0004 2.52804 32.0004 3.61704V6.41734H25.8468ZM25.8468 14.7307V10.6178H32.0004V15.1099C32.0004 16.1989 31.6018 17.074 30.8048 17.7352C30.0312 18.3964 28.7067 18.727 26.8314 18.727H24.159V15.3724H24.9677C25.2725 15.3724 25.4952 15.3238 25.6358 15.2266C25.7765 15.1099 25.8468 14.9446 25.8468 14.7307Z" fill="#00FFF2"/>
                    <path d="M9.38855 7.81748V4.28795C9.38855 4.07404 9.31822 3.91846 9.17757 3.82123C9.03691 3.70455 8.81421 3.64621 8.50947 3.64621H7.34909V0H10.3731C12.2485 0 13.573 0.33059 14.3465 0.99177C15.1436 1.65295 15.5421 2.52804 15.5421 3.61704V7.81748H9.38855ZM9.38855 14.439V7.43828H15.5421V15.1099C15.5421 16.1989 15.1436 17.074 14.3465 17.7352C13.573 18.3964 12.2485 18.727 10.3731 18.727H7.34909V15.0807H8.50947C8.81421 15.0807 9.03691 15.0321 9.17757 14.9349C9.31822 14.8182 9.38855 14.6529 9.38855 14.439ZM6.15354 4.28795V7.81748H0V3.61704C0 2.52804 0.386794 1.65295 1.16038 0.99177C1.95741 0.33059 3.29361 0 5.16897 0H8.193V3.64621H7.03262C6.72787 3.64621 6.50517 3.70455 6.36452 3.82123C6.22387 3.91846 6.15354 4.07404 6.15354 4.28795ZM6.15354 7.43828V14.439C6.15354 14.6529 6.22387 14.8182 6.36452 14.9349C6.50517 15.0321 6.72787 15.0807 7.03262 15.0807H8.193V18.727H5.16897C3.29361 18.727 1.95741 18.3964 1.16038 17.7352C0.386794 17.074 0 16.1989 0 15.1099V7.43828H6.15354Z" fill="white"/>
                    <path d="M9.38855 7.81748V4.28795C9.38855 4.07404 9.31822 3.91846 9.17757 3.82123C9.03691 3.70455 8.81421 3.64621 8.50947 3.64621H7.34909V0H10.3731C12.2485 0 13.573 0.33059 14.3465 0.99177C15.1436 1.65295 15.5421 2.52804 15.5421 3.61704V7.81748H9.38855ZM9.38855 14.439V7.43828H15.5421V15.1099C15.5421 16.1989 15.1436 17.074 14.3465 17.7352C13.573 18.3964 12.2485 18.727 10.3731 18.727H7.34909V15.0807H8.50947C8.81421 15.0807 9.03691 15.0321 9.17757 14.9349C9.31822 14.8182 9.38855 14.6529 9.38855 14.439ZM6.15354 4.28795V7.81748H0V3.61704C0 2.52804 0.386794 1.65295 1.16038 0.99177C1.95741 0.33059 3.29361 0 5.16897 0H8.193V3.64621H7.03262C6.72787 3.64621 6.50517 3.70455 6.36452 3.82123C6.22387 3.91846 6.15354 4.07404 6.15354 4.28795ZM6.15354 7.43828V14.439C6.15354 14.6529 6.22387 14.8182 6.36452 14.9349C6.50517 15.0321 6.72787 15.0807 7.03262 15.0807H8.193V18.727H5.16897C3.29361 18.727 1.95741 18.3964 1.16038 17.7352C0.386794 17.074 0 16.1989 0 15.1099V7.43828H6.15354Z" fill="url(#og_gradient_2)"/>
                    <path d="M9.38839 21.0905V17.561C9.38839 17.3471 9.31807 17.1915 9.17741 17.0943C9.03676 16.9776 8.81406 16.9193 8.50932 16.9193H7.34893V13.273H10.373C12.2483 13.273 13.5728 13.6036 14.3464 14.2648C15.1434 14.926 15.5419 15.8011 15.5419 16.8901V21.0905H9.38839ZM9.38839 27.712V20.7113H15.5419V28.383C15.5419 29.472 15.1434 30.347 14.3464 31.0082C13.5728 31.6694 12.2483 32 10.373 32H7.34893V28.3538H8.50932C8.81406 28.3538 9.03676 28.3052 9.17741 28.2079C9.31807 28.0913 9.38839 27.926 9.38839 27.712ZM6.15339 17.561V21.0905H-0.000152588V16.8901C-0.000152588 15.8011 0.386641 14.926 1.16023 14.2648C1.95726 13.6036 3.29346 13.273 5.16882 13.273H8.19285V16.9193H7.03247C6.72772 16.9193 6.50502 16.9776 6.36437 17.0943C6.22371 17.1915 6.15339 17.3471 6.15339 17.561ZM6.15339 20.7113V27.712C6.15339 27.926 6.22371 28.0913 6.36437 28.2079C6.50502 28.3052 6.72772 28.3538 7.03247 28.3538H8.19285V32H5.16882C3.29346 32 1.95726 31.6694 1.16023 31.0082C0.386641 30.347 -0.000152588 29.472 -0.000152588 28.383V20.7113H6.15339Z" fill="#00FFF2"/>
                </g>
                <defs>
                    <clipPath id="og_clip">
                        <rect width="32" height="32" fill="white"/>
                    </clipPath>
                </defs>
            </svg>`,
        'verified': `<svg width="16" height="16" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle;">
                <defs>
                    <linearGradient id="verified_gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#00ff88;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#00cc66;stop-opacity:1" />
                    </linearGradient>
                </defs>
                <path d="M30.8598 19.2368C30.1977 18.2069 29.5356 17.2138 28.8736 16.1839C28.7264 15.9632 28.7264 15.8161 28.8736 15.5954C29.5356 14.6023 30.1609 13.6092 30.823 12.6161C31.5954 11.4391 31.1908 10.2989 29.8667 9.82069C28.7632 9.41609 27.6598 8.97471 26.5563 8.57012C26.3356 8.49656 26.2253 8.34943 26.2253 8.09196C26.1885 6.87816 26.1149 5.66437 26.0414 4.48736C25.9678 3.2 24.9747 2.46437 23.7241 2.7954C22.5471 3.08966 21.3701 3.42069 20.2299 3.75173C19.9724 3.82529 19.8253 3.75173 19.6414 3.56782C18.9057 2.61149 18.1333 1.69195 17.3977 0.772414C16.5885 -0.257472 15.3379 -0.257472 14.492 0.772414C13.7563 1.69195 12.9839 2.61149 12.2851 3.53103C12.1012 3.7885 11.9172 3.82529 11.623 3.75173C10.4828 3.42069 9.34253 3.12644 8.53334 2.90575C6.95173 2.53793 5.99541 3.16322 5.92184 4.48736C5.84828 5.70115 5.77472 6.91495 5.73794 8.16552C5.73794 8.42299 5.62759 8.53333 5.4069 8.64368C4.26667 9.08506 3.12644 9.52644 1.98621 9.96782C0.809203 10.446 0.441387 11.5862 1.14023 12.6529C1.8023 13.6828 2.46437 14.6759 3.12644 15.7057C3.27356 15.9264 3.27356 16.0736 3.12644 16.331C2.42759 17.3609 1.76552 18.3908 1.10345 19.4575C0.478165 20.4506 0.882759 21.6276 1.98621 22.069C3.12644 22.5104 4.30345 22.9517 5.44368 23.3931C5.70115 23.4667 5.77471 23.6138 5.77471 23.8713C5.81149 25.0483 5.95862 26.1885 5.95862 27.3655C5.95862 28.5425 6.9885 29.6092 8.42298 29.1678C9.56321 28.8 10.7034 28.5425 11.8437 28.2115C12.0644 28.1379 12.2115 28.1747 12.3586 28.3954C13.131 29.3517 13.8667 30.2713 14.6391 31.2276C15.485 32.2575 16.6988 32.2575 17.508 31.2276C18.2805 30.2713 19.0161 29.3517 19.7885 28.3954C19.9356 28.2115 20.046 28.1379 20.3034 28.2115C21.4804 28.5425 22.6575 28.8368 23.8345 29.1678C25.0483 29.4988 26.0781 28.7632 26.1149 27.5126C26.1885 26.2989 26.2621 25.0851 26.2988 23.8345C26.2988 23.5402 26.446 23.4299 26.6667 23.3563C27.7701 22.9517 28.9103 22.5104 30.0138 22.069C31.1908 21.4805 31.5586 20.3034 30.8598 19.2368ZM22.069 13.2046L14.7127 20.5609C14.5287 20.7448 14.2713 20.892 14.0138 20.9287C13.9402 20.9287 13.8299 20.9655 13.7563 20.9655C13.4253 20.9655 13.0575 20.8184 12.8 20.5609L9.78392 17.5448C9.26898 17.0299 9.26898 16.1839 9.78392 15.669C10.2989 15.154 11.1448 15.154 11.6598 15.669L13.7196 17.7287L20.1196 11.3287C20.6345 10.8138 21.4805 10.8138 21.9954 11.3287C22.5839 11.8437 22.5839 12.6897 22.069 13.2046Z" fill="url(#verified_gradient)"/>
            </svg>`,
        'founder': `<svg width="16" height="16" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle;">
                <defs>
                    <linearGradient id="founder_gradient_1" x1="15.7467" y1="-4.46667" x2="16.2533" y2="36.6933" gradientUnits="userSpaceOnUse">
                        <stop stop-color="#FFC900"/>
                        <stop offset="0.99" stop-color="#FF9500"/>
                    </linearGradient>
                    <linearGradient id="founder_gradient_2" x1="16" y1="0" x2="16" y2="32" gradientUnits="userSpaceOnUse">
                        <stop stop-color="white" stop-opacity="0.3"/>
                        <stop offset="1" stop-color="white" stop-opacity="0.15"/>
                    </linearGradient>
                    <linearGradient id="founder_gradient_3" x1="15.7936" y1="-0.677142" x2="16.2064" y2="32.8618" gradientUnits="userSpaceOnUse">
                        <stop stop-color="#FFC900"/>
                        <stop offset="0.99" stop-color="#FF9500"/>
                    </linearGradient>
                    <linearGradient id="founder_gradient_4" x1="18.5966" y1="16.7273" x2="11.3807" y2="16.7273" gradientUnits="userSpaceOnUse">
                        <stop stop-color="white" stop-opacity="0.1"/>
                        <stop offset="0.3" stop-color="white" stop-opacity="0.2"/>
                        <stop offset="0.65" stop-color="white" stop-opacity="0.05"/>
                        <stop offset="1" stop-color="white" stop-opacity="0.2"/>
                    </linearGradient>
                </defs>
                <g clip-path="url(#founder_clip)">
                    <path d="M16 32C24.8366 32 32 24.8366 32 16C32 7.16344 24.8366 0 16 0C7.16344 0 0 7.16344 0 16C0 24.8366 7.16344 32 16 32Z" fill="url(#founder_gradient_1)"/>
                    <path d="M16 32C24.8366 32 32 24.8366 32 16C32 7.16344 24.8366 0 16 0C7.16344 0 0 7.16344 0 16C0 24.8366 7.16344 32 16 32Z" fill="url(#founder_gradient_2)"/>
                    <path d="M16 29.0375C23.2004 29.0375 29.0375 23.2004 29.0375 16C29.0375 8.79958 23.2004 2.96249 16 2.96249C8.79959 2.96249 2.9625 8.79958 2.9625 16C2.9625 23.2004 8.79959 29.0375 16 29.0375Z" fill="#FEB635"/>
                    <path d="M16 29.0375C23.2004 29.0375 29.0375 23.2004 29.0375 16C29.0375 8.79958 23.2004 2.96249 16 2.96249C8.79959 2.96249 2.9625 8.79958 2.9625 16C2.9625 23.2004 8.79959 29.0375 16 29.0375Z" fill="url(#founder_gradient_3)"/>
                    <path d="M29.0375 16C29.0375 23.1875 23.1875 29.0375 16 29.0375C13.6563 29.0375 11.4625 28.4187 9.5625 27.3312C11.3125 28.2062 13.2875 28.7 15.375 28.7C22.5625 28.7 28.4125 22.85 28.4125 15.6625C28.4125 10.8188 25.75 6.58125 21.8125 4.3375C26.0938 6.475 29.0375 10.8938 29.0375 16ZM16.8875 3.575C19.4563 3.575 21.85 4.325 23.8625 5.60625C21.675 3.95625 18.95 2.96875 16 2.96875C8.8125 2.96875 2.9625 8.8125 2.9625 16.0063C2.9625 20.6437 5.4 24.7313 9.0625 27.0312C5.9 24.65 3.85 20.8687 3.85 16.6125C3.85 9.425 9.7 3.575 16.8875 3.575Z" fill="black" fill-opacity="0.05"/>
                    <path d="M18.5966 9.45456V24H14.6477V13.0909H14.5625L11.3807 14.9943V11.6421L14.9602 9.45456H18.5966Z" fill="black" fill-opacity="0.8"/>
                    <path d="M18.5966 9.45456V24H14.6477V13.0909H14.5625L11.3807 14.9943V11.6421L14.9602 9.45456H18.5966Z" fill="url(#founder_gradient_4)" fill-opacity="0.5"/>
                    <path d="M18.5966 9.45456V24H14.6477V13.0909H14.5625L11.3807 14.9943V11.6421L14.9602 9.45456H18.5966Z" stroke="black" stroke-opacity="0.1" stroke-width="0.350269"/>
                </g>
                <defs>
                    <clipPath id="founder_clip">
                        <rect width="32" height="32" fill="white"/>
                    </clipPath>
                </defs>
            </svg>`,
        'subscriber': `<svg width="16" height="16" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle;">
                <defs>
                    <radialGradient id="subscriber_gradient" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(16 16) rotate(90) scale(16)">
                        <stop stop-color="#E1FF00"/>
                        <stop offset="1" stop-color="#2AA300"/>
                    </radialGradient>
                </defs>
                <g clip-path="url(#subscriber_clip)">
                    <path d="M17.0284 2.91378L16.2357 0.667951C16.1573 0.445558 15.8427 0.445558 15.7643 0.667951L14.9716 2.91378C12.9003 8.78263 8.78263 12.9003 2.91378 14.9716L0.667951 15.7643C0.445558 15.8427 0.445558 16.1573 0.667951 16.2357L2.91378 17.0284C8.78263 19.0998 12.9003 23.2174 14.9716 29.0862L15.7643 31.3321C15.8427 31.5544 16.1573 31.5544 16.2357 31.3321L17.0284 29.0862C19.0998 23.2174 23.2174 19.0998 29.0862 17.0284L31.3321 16.2357C31.5544 16.1573 31.5544 15.8427 31.3321 15.7643L29.0862 14.9716C23.2174 12.9003 19.0998 8.78263 17.0284 2.91378Z" fill="black"/>
                    <path d="M17.0284 2.91378L16.2357 0.667951C16.1573 0.445558 15.8427 0.445558 15.7643 0.667951L14.9716 2.91378C12.9003 8.78263 8.78263 12.9003 2.91378 14.9716L0.667951 15.7643C0.445558 15.8427 0.445558 16.1573 0.667951 16.2357L2.91378 17.0284C8.78263 19.0998 12.9003 23.2174 14.9716 29.0862L15.7643 31.3321C15.8427 31.5544 16.1573 31.5544 16.2357 31.3321L17.0284 29.0862C19.0998 23.2174 23.2174 19.0998 29.0862 17.0284L31.3321 16.2357C31.5544 16.1573 31.5544 15.8427 31.3321 15.7643L29.0862 14.9716C23.2174 12.9003 19.0998 8.78263 17.0284 2.91378Z" fill="url(#subscriber_gradient)"/>
                </g>
                <defs>
                    <clipPath id="subscriber_clip">
                        <rect width="32" height="32" fill="white"/>
                    </clipPath>
                </defs>
            </svg>`
    };
    
    const svg = svgBadges[badgeType] || null;
    console.log(`SVG found for ${badgeType}: ${!!svg}, length: ${svg?.length || 0}`);
    
    return svg;
  }

  disconnect() {
    if (this.ws) {
      console.log('Disconnecting WebSocket...');
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  async cleanup(): Promise<void> {
    this.disconnect();
    await this.browserService.cleanup();
  }

  isChannelConnected(): boolean {
    return this.isConnected && this.currentChannel !== null;
  }

  getCurrentChannel(): string | null {
      return this.currentChannel;
  }
}