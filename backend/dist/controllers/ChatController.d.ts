import { Server, Socket } from 'socket.io';
import { ServerToClientEvents, ClientToServerEvents, ChannelInfo } from '../types';
export declare class ChatController {
    private io;
    private kickChatService;
    private badgeService;
    private emoteService;
    private connectedClients;
    constructor(io: Server<ClientToServerEvents, ServerToClientEvents>);
    private setupKickChatHandlers;
    handleConnection(socket: Socket): void;
    handleJoinChannel(socket: Socket, channelName: string): Promise<void>;
    private processBadgesForMessage;
    handleBadgeData(data: {
        channelName: string;
        subscriber_badges: any;
        channelInfo: ChannelInfo;
    }): void;
    handleLeaveChannel(socket: Socket): void;
    handleDisconnect(socket: Socket): void;
    getActiveConnections(): number;
    getConnectedChannels(): string[];
}
//# sourceMappingURL=ChatController.d.ts.map