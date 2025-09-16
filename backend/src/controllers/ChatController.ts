// backend/src/controllers/ChatController.ts

import { Server, Socket } from 'socket.io';
import { KickChatService } from '../services/KickChatService';
import { BadgeService } from '../services/BadgeService';
import { EmoteService } from '../services/EmoteService';
import { ServerToClientEvents, ClientToServerEvents, ChatMessage, ChannelInfo } from '../types';

export class ChatController {
  private channelServices: Map<string, KickChatService>;
  private badgeService: BadgeService;
  private emoteService: EmoteService;
  private connectedClients: Map<string, { socket: Socket; channelName?: string }>;

  constructor(private io: Server<ClientToServerEvents, ServerToClientEvents>) {
    this.channelServices = new Map();
    this.badgeService = new BadgeService();
    this.emoteService = new EmoteService();
    this.connectedClients = new Map();
  }

  private setupKickChatHandlers(channelName: string, service: KickChatService) {
    service.onMessage((message: ChatMessage) => {
      // Use the channel name to get the correct badge data
      const processedMessage = this.processBadgesForMessage(message, channelName);
      // Emit to the specific channel room
      this.io.to(`channel:${channelName}`).emit('chatMessage', processedMessage);
    });

    service.onChannelConnected((channelInfo: ChannelInfo) => {
      console.log(`KickChatService connected to ${channelInfo.username}. Notifying clients.`);
      // Emit to the specific channel room
      this.io.to(`channel:${channelName}`).emit('channelConnected', channelInfo);
    });

    service.onError((error: string) => {
      console.error(`KickChatService error for ${channelName}:`, error);
      // Emit to the specific channel room
      this.io.to(`channel:${channelName}`).emit('connectionError', error);
    });
  }

  handleConnection(socket: Socket) {
    console.log(`Client connected: ${socket.id}`);
    this.connectedClients.set(socket.id, { socket });

    socket.on('joinChannel', (channelName: string) => this.handleJoinChannel(socket, channelName));
    socket.on('leaveChannel', () => this.handleLeaveChannel(socket));
    socket.on('disconnect', () => this.handleDisconnect(socket));
    socket.on('badgeData', (data) => this.handleBadgeData(data));
  }

  async handleJoinChannel(socket: Socket, channelName: string) {
    try {
      console.log(`Client ${socket.id} attempting to join channel: ${channelName}`);
      this.connectedClients.set(socket.id, { socket, channelName });
      
      // Join the socket to the channel-specific room
      socket.join(`channel:${channelName}`);
      
      // Get or create a KickChatService for this channel
      let service = this.channelServices.get(channelName);
      if (!service) {
        console.log(`Creating new KickChatService for channel: ${channelName}`);
        service = new KickChatService();
        
        // Set up lookup functions for this service
        service.setChatroomIdLookup((chName: string) => this.getCachedChatroomId(chName));
        service.setChannelIdLookup((chName: string) => this.getCachedChannelId(chName));
        
        // Set up event handlers for this channel
        this.setupKickChatHandlers(channelName, service);
        
        // Store the service
        this.channelServices.set(channelName, service);
        
        // Connect to the channel
        await service.connectToChannel(channelName);
      } else {
        console.log(`Using existing KickChatService for channel: ${channelName}`);
        // Channel already connected, just notify the client
        if (service.getCurrentChannel() === channelName) {
          socket.emit('channelConnected', {
            id: 'fallback',
            slug: channelName.toLowerCase(),
            username: channelName,
            chatroom: { id: 'unknown', channel_id: 'unknown' },
            subscriber_badges: []
          });
        }
      }
      
      console.log(`Successfully started connection process for ${socket.id} to channel: ${channelName}`);
    } catch (error) {
      console.error(`Failed to start connection process for ${channelName}:`, error);
      socket.emit('connectionError', `Failed to connect to channel: ${channelName}`);
    }
  }

  private processBadgesForMessage(message: ChatMessage, channelName: string): ChatMessage {
    const processedBadges = message.badges.map(badge => {
      if (badge.type === 'subscriber' && badge.count) {
        // Use BadgeService to process subscriber badges
        const kickBadges = [{
          type: 'subscriber',
          text: badge.alt,
          count: badge.count
        }];
        
        const processedBadge = this.badgeService.processUserBadges(kickBadges, channelName)[0];
        if (processedBadge && processedBadge.isCustom) {
          console.log(`Found custom subscriber badge for ${badge.count} months: ${processedBadge.image}`);
          return {
            ...badge,
            image: processedBadge.image,
            isCustom: true
          };
        }
      }
      return badge;
    });

    return { ...message, badges: processedBadges };
  }

  handleBadgeData(data: { channelName: string; subscriber_badges: any; channelInfo: ChannelInfo }) {
    console.log(`Received badge data for channel: ${data.channelName}`);
    console.log(`Badge data:`, {
      channelName: data.channelName,
      subscriberBadgesCount: data.subscriber_badges?.length || 0,
      subscriberBadges: data.subscriber_badges
    });
    
    // Extract chatroom ID and channel ID from channelInfo if available
    if (data.channelInfo?.chatroom?.id) {
      console.log(`🎉 Frontend provided chatroom ID for ${data.channelName}: ${data.channelInfo.chatroom.id}`);
      // Store this for use by KickChatService
      this.storeChatroomId(data.channelName, data.channelInfo.chatroom.id);
    }
    
    // Also extract channel ID from badge data
    if (data.subscriber_badges && data.subscriber_badges.length > 0) {
      const channelId = data.subscriber_badges[0].channel_id;
      if (channelId) {
        console.log(`🎉 Frontend provided channel ID for ${data.channelName}: ${channelId}`);
        this.storeChannelId(data.channelName, channelId.toString());
      }
    }
    
    // Now that we have both IDs, trigger subscription with correct channels
    if (data.channelInfo?.chatroom?.id && data.subscriber_badges && data.subscriber_badges.length > 0) {
      console.log(`🚀 Triggering subscription with correct channel patterns for ${data.channelName}`);
      // Get the service for this specific channel
      const service = this.channelServices.get(data.channelName);
      if (service) {
        // Small delay to ensure the IDs are cached
        setTimeout(() => {
          service.subscribeToChannels(data.channelName);
        }, 500);
      }
    }
    
    // Cache the badge data using BadgeService
    this.badgeService.cacheSubscriberBadgesFromFrontend(data.channelName, data.subscriber_badges);
  }

  private chatroomIdCache = new Map<string, string>();
  private channelIdCache = new Map<string, string>();

  private storeChatroomId(channelName: string, chatroomId: string) {
    this.chatroomIdCache.set(channelName.toLowerCase(), chatroomId);
    console.log(`💾 Cached chatroom ID for ${channelName}: ${chatroomId}`);
  }

  private storeChannelId(channelName: string, channelId: string) {
    this.channelIdCache.set(channelName.toLowerCase(), channelId);
    console.log(`💾 Cached channel ID for ${channelName}: ${channelId}`);
  }

  getCachedChatroomId(channelName: string): string | null {
    return this.chatroomIdCache.get(channelName.toLowerCase()) || null;
  }

  getCachedChannelId(channelName: string): string | null {
    return this.channelIdCache.get(channelName.toLowerCase()) || null;
  }

  handleLeaveChannel(socket: Socket) {
    const clientInfo = this.connectedClients.get(socket.id);
    if (clientInfo?.channelName) {
      console.log(`Client ${socket.id} leaving channel: ${clientInfo.channelName}`);
      // Leave the channel room
      socket.leave(`channel:${clientInfo.channelName}`);
      
      // Check if this was the last client for this channel
      const remainingClients = Array.from(this.connectedClients.values())
        .filter(client => client.channelName === clientInfo.channelName);
      
      if (remainingClients.length <= 1) { // Current client is still in the map
        console.log(`No more clients for channel ${clientInfo.channelName}, disconnecting service`);
        const service = this.channelServices.get(clientInfo.channelName);
        if (service) {
          service.disconnect();
          this.channelServices.delete(clientInfo.channelName);
        }
      }
    }
    this.connectedClients.delete(socket.id);
  }

  handleDisconnect(socket: Socket) {
    this.handleLeaveChannel(socket);
  }

  getActiveConnections(): number {
    return this.connectedClients.size;
  }

  getConnectedChannels(): string[] {
    const channels = Array.from(this.connectedClients.values())
      .map(client => client.channelName)
      .filter((name, index, self): name is string => name !== undefined && self.indexOf(name) === index);
    return channels as string[];
  }
}