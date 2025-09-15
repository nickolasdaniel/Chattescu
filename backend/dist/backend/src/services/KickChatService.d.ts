import { EventEmitter } from 'events';
import { ChatMessage, ChannelInfo } from '../types';
export declare class KickChatService extends EventEmitter {
    private readonly KICK_API_BASE;
    private readonly PUSHER_APP_KEY;
    private readonly PUSHER_CLUSTER;
    private ws;
    private currentChannel;
    private isConnected;
    private sevenTVService;
    constructor();
    onMessage(callback: (message: ChatMessage) => void): void;
    onChannelConnected(callback: (channelInfo: ChannelInfo) => void): void;
    onError(callback: (error: string) => void): void;
    connectToChannel(channelName: string): Promise<void>;
    private connectToPusherWebSocket;
    private transformKickMessage;
    private getSimpleBadgeImage;
    private getKickBadgeSVG;
    disconnect(): void;
    isChannelConnected(): boolean;
    getCurrentChannel(): string | null;
}
//# sourceMappingURL=KickChatService.d.ts.map