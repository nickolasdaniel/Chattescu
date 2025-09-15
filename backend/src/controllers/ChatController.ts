// backend/src/controllers/ChatController.ts

import { Server, Socket } from 'socket.io';
import { KickChatService } from '../services/KickChatService';
import { BadgeService } from '../services/BadgeService';
import { EmoteService } from '../services/EmoteService';
import { ServerToClientEvents, ClientToServerEvents, ChatMessage, ChannelInfo } from '../types';

export class ChatController {
  private kickChatService: KickChatService;
  private badgeService: BadgeService;
  private emoteService: EmoteService;
  private connectedClients: Map<string, { socket: Socket; channelName?: string }>;

  constructor(private io: Server<ClientToServerEvents, ServerToClientEvents>) {
    this.kickChatService = new KickChatService();
    this.badgeService = new BadgeService();
    this.emoteService = new EmoteService();
    this.connectedClients = new Map();

    this.setupKickChatHandlers();
  }

  private setupKickChatHandlers() {
    this.kickChatService.onMessage((message: ChatMessage) => {
      // Use the channel name to get the correct badge data
      const channelName = this.kickChatService.getCurrentChannel() || '';
      const processedMessage = this.processBadgesForMessage(message, channelName);
      this.io.emit('chatMessage', processedMessage);
    });

    this.kickChatService.onChannelConnected((channelInfo: ChannelInfo) => {
      console.log(`KickChatService connected to ${channelInfo.username}. Notifying clients.`);
      this.io.emit('channelConnected', channelInfo);
    });

    this.kickChatService.onError((error: string) => {
      console.error('KickChatService error:', error);
      this.io.emit('connectionError', error);
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
      
      this.kickChatService.connectToChannel(channelName);
      
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
    // Cache the badge data using BadgeService
    this.badgeService.cacheSubscriberBadgesFromFrontend(data.channelName, data.subscriber_badges);
  }

  handleLeaveChannel(socket: Socket) {
    const clientInfo = this.connectedClients.get(socket.id);
    if (clientInfo?.channelName) {
      console.log(`Client ${socket.id} leaving channel: ${clientInfo.channelName}`);
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