"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatController = void 0;
const KickChatService_1 = require("../services/KickChatService");
const BadgeService_1 = require("../services/BadgeService");
const EmoteService_1 = require("../services/EmoteService");
class ChatController {
    constructor(io) {
        this.io = io;
        this.kickChatService = new KickChatService_1.KickChatService();
        this.badgeService = new BadgeService_1.BadgeService();
        this.emoteService = new EmoteService_1.EmoteService();
        this.connectedClients = new Map();
        this.setupKickChatHandlers();
    }
    setupKickChatHandlers() {
        this.kickChatService.onMessage((message) => {
            const channelName = this.kickChatService.getCurrentChannel() || '';
            const processedMessage = this.processBadgesForMessage(message, channelName);
            this.io.emit('chatMessage', processedMessage);
        });
        this.kickChatService.onChannelConnected((channelInfo) => {
            console.log(`KickChatService connected to ${channelInfo.username}. Notifying clients.`);
            this.io.emit('channelConnected', channelInfo);
        });
        this.kickChatService.onError((error) => {
            console.error('KickChatService error:', error);
            this.io.emit('connectionError', error);
        });
    }
    handleConnection(socket) {
        console.log(`Client connected: ${socket.id}`);
        this.connectedClients.set(socket.id, { socket });
        socket.on('joinChannel', (channelName) => this.handleJoinChannel(socket, channelName));
        socket.on('leaveChannel', () => this.handleLeaveChannel(socket));
        socket.on('disconnect', () => this.handleDisconnect(socket));
        socket.on('badgeData', (data) => this.handleBadgeData(data));
    }
    async handleJoinChannel(socket, channelName) {
        try {
            console.log(`Client ${socket.id} attempting to join channel: ${channelName}`);
            this.connectedClients.set(socket.id, { socket, channelName });
            this.kickChatService.connectToChannel(channelName);
            console.log(`✅ Successfully started connection process for ${socket.id} to channel: ${channelName}`);
        }
        catch (error) {
            console.error(`❌ Failed to start connection process for ${channelName}:`, error);
            socket.emit('connectionError', `Failed to connect to channel: ${channelName}`);
        }
    }
    processBadgesForMessage(message, channelName) {
        const processedBadges = message.badges.map(badge => {
            if (badge.type === 'subscriber' && badge.count) {
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
    handleBadgeData(data) {
        console.log(`Received badge data for channel: ${data.channelName}`);
        this.badgeService.cacheSubscriberBadgesFromFrontend(data.channelName, data.subscriber_badges);
    }
    handleLeaveChannel(socket) {
        const clientInfo = this.connectedClients.get(socket.id);
        if (clientInfo?.channelName) {
            console.log(`Client ${socket.id} leaving channel: ${clientInfo.channelName}`);
        }
        this.connectedClients.delete(socket.id);
    }
    handleDisconnect(socket) {
        this.handleLeaveChannel(socket);
    }
    getActiveConnections() {
        return this.connectedClients.size;
    }
    getConnectedChannels() {
        const channels = Array.from(this.connectedClients.values())
            .map(client => client.channelName)
            .filter((name, index, self) => name !== undefined && self.indexOf(name) === index);
        return channels;
    }
}
exports.ChatController = ChatController;
//# sourceMappingURL=ChatController.js.map