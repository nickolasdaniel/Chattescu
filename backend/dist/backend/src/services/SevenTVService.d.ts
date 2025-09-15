import { SevenTVCosmetics } from '../types';
export declare class SevenTVService {
    private readonly SEVENTV_API_BASE;
    private readonly KICK_API_BASE;
    private cosmeticsCache;
    private enabled;
    private proxyUrl;
    private httpsAgent;
    constructor();
    getUserCosmetics(username: string): Promise<SevenTVCosmetics | null>;
    private getKickUserId;
    colorNumberToHex(colorNumber: number): string;
    hasCosmetics(cosmetics: SevenTVCosmetics | null): boolean;
    setEnabled(enabled: boolean): void;
    isEnabled(): boolean;
    setProxy(proxyUrl: string | null): void;
    getProxy(): string | null;
    clearCache(): void;
}
//# sourceMappingURL=SevenTVService.d.ts.map