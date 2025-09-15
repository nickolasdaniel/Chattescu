"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SevenTVService = void 0;
const axios_1 = __importDefault(require("axios"));
class SevenTVService {
    constructor() {
        this.SEVENTV_API_BASE = 'https://7tv.io/v3';
        this.KICK_API_BASE = 'https://kick.com/api/v2';
        this.cosmeticsCache = new Map();
    }
    async getUserCosmetics(username) {
        try {
            const cached = this.cosmeticsCache.get(username.toLowerCase());
            if (cached) {
                return cached;
            }
            const kickUserId = await this.getKickUserId(username);
            if (!kickUserId) {
                return null;
            }
            const response = await axios_1.default.get(`${this.SEVENTV_API_BASE}/users/kick/${kickUserId}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'application/json',
                },
                timeout: 5000,
            });
            const cosmetics = response.data;
            this.cosmeticsCache.set(username.toLowerCase(), cosmetics);
            console.log(`Loaded 7TV cosmetics for ${username}:`, {
                hasPaint: !!cosmetics.user.style.paint_id,
                color: cosmetics.user.style.color,
                roles: cosmetics.roles.length
            });
            return cosmetics;
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                if (error.response?.status === 404) {
                    console.log(`No 7TV account found for ${username}`);
                }
                else {
                    console.error(`Failed to fetch 7TV cosmetics for ${username}:`, {
                        status: error.response?.status,
                        statusText: error.response?.statusText,
                        message: error.message
                    });
                }
            }
            else {
                console.error(`Unexpected error fetching 7TV cosmetics for ${username}:`, error);
            }
            return null;
        }
    }
    async getKickUserId(username) {
        try {
            const response = await axios_1.default.get(`${this.KICK_API_BASE}/channels/${username}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'application/json',
                },
                timeout: 5000,
            });
            return response.data.user_id?.toString() || null;
        }
        catch (error) {
            console.error(`Failed to get Kick user ID for ${username}:`, error);
            return null;
        }
    }
    colorNumberToHex(colorNumber) {
        const hex = (colorNumber >>> 0).toString(16).padStart(8, '0');
        return `#${hex.substring(2)}`;
    }
    hasCosmetics(cosmetics) {
        if (!cosmetics)
            return false;
        return !!(cosmetics.user.style.paint_id ||
            cosmetics.user.style.badge_id ||
            cosmetics.roles.length > 0);
    }
    clearCache() {
        this.cosmeticsCache.clear();
        console.log('7TV cosmetics cache cleared');
    }
}
exports.SevenTVService = SevenTVService;
//# sourceMappingURL=SevenTVService.js.map