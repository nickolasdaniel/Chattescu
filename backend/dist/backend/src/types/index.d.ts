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
    id: string;
    platform: string;
    username: string;
    display_name: string;
    linked_at: number;
    emote_capacity: number;
    emote_set_id?: string;
    emote_set?: any;
    user: {
        id: string;
        username: string;
        display_name: string;
        created_at: number;
        avatar_url: string;
        style: {
            color: number;
            paint_id?: string;
            badge_id?: string;
        };
    };
    emote_sets: Array<{
        id: string;
        name: string;
        flags: number;
        tags: string[];
        capacity: number;
    }>;
    roles: string[];
    connections: Array<{
        id: string;
        platform: string;
        username: string;
        display_name: string;
        linked_at: number;
        emote_capacity: number;
        emote_set_id?: string;
        emote_set?: any;
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