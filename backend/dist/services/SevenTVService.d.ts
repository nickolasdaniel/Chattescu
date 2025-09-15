import { SevenTVCosmetics } from '../types';
export declare class SevenTVService {
    private readonly SEVENTV_API_BASE;
    private readonly KICK_API_BASE;
    private cosmeticsCache;
    getUserCosmetics(username: string): Promise<SevenTVCosmetics | null>;
    private getKickUserId;
    colorNumberToHex(colorNumber: number): string;
    hasCosmetics(cosmetics: SevenTVCosmetics | null): boolean;
    clearCache(): void;
}
//# sourceMappingURL=SevenTVService.d.ts.map