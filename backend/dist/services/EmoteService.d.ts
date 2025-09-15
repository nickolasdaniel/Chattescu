import { SevenTVEmote } from '../types';
export declare class EmoteService {
    private readonly KICK_API_BASE;
    private globalEmotesCache;
    private channelEmotesCache;
    private kickUserIdCache;
    loadChannelEmotes(channelName: string): Promise<SevenTVEmote[]>;
    private loadGlobalEmotes;
    private loadChannelSpecificEmotes;
    private getKickUserId;
    private buildEmoteUrl;
    parseMessageEmotes(content: string, channelName: string): string;
    parseKickEmotes(content: string): string;
    private escapeRegExp;
    getAllEmotesForChannel(channelName: string): SevenTVEmote[];
    clearChannelCache(channelName: string): void;
    clearAllCaches(): void;
    getCacheStats(): {
        globalEmotes: number;
        channelCaches: number;
        userIdCaches: number;
    };
}
//# sourceMappingURL=EmoteService.d.ts.map