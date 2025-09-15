export interface ChatMessage {
    id: string;
    username: string;
    content: string;
    timestamp: Date;
    badges: Badge[];
    emotes: Emote[];
    user: ChatUser;
}
export interface ChatUser {
    id: string;
    username: string;
    identity: UserIdentity;
    cosmetics?: SevenTVCosmetics;
}
export interface UserIdentity {
    color?: string;
    badges: KickBadge[];
}
export interface Badge {
    type: string;
    image: string;
    alt: string;
    isCustom: boolean;
    count?: number;
    is7TV?: boolean;
}
export interface KickBadge {
    type: string;
    text: string;
    count?: number;
}
export interface Emote {
    id: string;
    name: string;
    source: string;
    type: 'kick' | '7tv-global' | '7tv-channel';
    animated?: boolean;
    position?: number;
}
export interface SubscriberBadge {
    id: string;
    months: number;
    url: string;
}
export interface SevenTVEmote {
    name: string;
    url: string;
    type: 'global' | 'channel';
    animated: boolean;
}
export interface SevenTVCosmetics {
    paint?: {
        color?: string;
        gradient?: {
            angle: number;
            stops: Array<{
                color: string;
                at: number;
            }>;
        };
        shaders?: any[];
        drop_shadow?: {
            x_offset: number;
            y_offset: number;
            radius: number;
            color: string;
        };
    };
    badges?: Array<{
        id: string;
        tooltip: string;
    }>;
}
export interface ChannelInfo {
    id: string;
    slug: string;
    username: string;
    chatroom: {
        id: string;
        channel_id: string;
    };
    subscriber_badges: Array<{
        id: string;
        months: number;
        badge_image: {
            src: string;
            srcset?: string;
        };
    }>;
}
export interface ServerToClientEvents {
    chatMessage: (message: ChatMessage) => void;
    channelConnected: (channelInfo: ChannelInfo) => void;
    connectionError: (error: string) => void;
    emotesLoaded: (emotes: SevenTVEmote[]) => void;
}
export interface ClientToServerEvents {
    joinChannel: (channelName: string) => void;
    leaveChannel: () => void;
}
//# sourceMappingURL=index.d.ts.map