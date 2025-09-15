import { ChannelInfo, Badge, SubscriberBadge, KickBadge } from '../types';
export declare class BadgeService {
    private readonly KICK_API_BASE;
    private subscriberBadgesCache;
    loadChannelBadges(channelName: string): Promise<ChannelInfo>;
    private cacheSubscriberBadges;
    processUserBadges(kickBadges: KickBadge[], channelName: string): Badge[];
    private processSubscriberBadge;
    private processGiftedSubBadge;
    private processStandardBadge;
    private getDefaultBadgeSVG;
    cacheSubscriberBadgesFromFrontend(channelName: string, badges: any[]): void;
    getChannelSubscriberBadges(channelName: string): SubscriberBadge[];
    clearCache(): void;
}
//# sourceMappingURL=BadgeService.d.ts.map