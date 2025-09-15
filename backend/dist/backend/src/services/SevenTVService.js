"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SevenTVService = void 0;
const axios_1 = __importDefault(require("axios"));
const https_proxy_agent_1 = require("https-proxy-agent");
class SevenTVService {
    constructor() {
        this.SEVENTV_API_BASE = 'https://7tv.io/v3';
        this.KICK_API_BASE = 'https://kick.com/api/v2';
        this.cosmeticsCache = new Map();
        this.enabled = process.env.SEVENTV_ENABLED !== 'false';
        this.proxyUrl = process.env.PROXY_URL;
        if (this.proxyUrl) {
            this.httpsAgent = new https_proxy_agent_1.HttpsProxyAgent(this.proxyUrl);
            console.log(`7TV Service initialized with proxy: ${this.proxyUrl}`);
        }
        else {
            console.log('7TV Service initialized without proxy');
        }
    }
    async getUserCosmetics(username) {
        if (!this.enabled) {
            console.log(`7TV cosmetics disabled for ${username}`);
            return null;
        }
        try {
            const cached = this.cosmeticsCache.get(username.toLowerCase());
            if (cached) {
                console.log(`Using cached 7TV cosmetics for ${username}`);
                return cached;
            }
            console.log(`Fetching 7TV cosmetics for ${username}...`);
            const kickUserId = await this.getKickUserId(username);
            if (!kickUserId) {
                console.log(`No Kick user ID found for ${username}, skipping 7TV lookup`);
                return null;
            }
            const response = await axios_1.default.get(`${this.SEVENTV_API_BASE}/users/kick/${kickUserId}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'DNT': '1',
                    'Connection': 'keep-alive',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'Referer': 'https://7tv.io/',
                    'Origin': 'https://7tv.io'
                },
                timeout: 15000,
                maxRedirects: 5,
                validateStatus: (status) => status < 500,
                ...(this.httpsAgent && { httpsAgent: this.httpsAgent }),
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
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'DNT': '1',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'cross-site',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'Referer': 'https://kick.com/',
                    'Origin': 'https://kick.com'
                },
                timeout: 15000,
                maxRedirects: 5,
                validateStatus: (status) => status < 500,
                ...(this.httpsAgent && { httpsAgent: this.httpsAgent }),
            });
            if (response.status === 403) {
                console.log(`Kick API blocked request for ${username} - skipping 7TV lookup`);
                return null;
            }
            return response.data.user_id?.toString() || null;
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                if (error.response?.status === 403) {
                    console.log(`Kick API blocked request for ${username} - skipping 7TV lookup`);
                }
                else {
                    console.error(`Failed to get Kick user ID for ${username}:`, {
                        status: error.response?.status,
                        statusText: error.response?.statusText,
                        message: error.message
                    });
                }
            }
            else {
                console.error(`Unexpected error getting Kick user ID for ${username}:`, error);
            }
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
    setEnabled(enabled) {
        this.enabled = enabled;
        console.log(`7TV cosmetics ${enabled ? 'enabled' : 'disabled'}`);
    }
    isEnabled() {
        return this.enabled;
    }
    setProxy(proxyUrl) {
        this.proxyUrl = proxyUrl || undefined;
        if (proxyUrl) {
            this.httpsAgent = new https_proxy_agent_1.HttpsProxyAgent(proxyUrl);
            console.log(`Proxy set to: ${proxyUrl}`);
        }
        else {
            this.httpsAgent = undefined;
            console.log('Proxy disabled');
        }
    }
    getProxy() {
        return this.proxyUrl || null;
    }
    clearCache() {
        this.cosmeticsCache.clear();
        console.log('7TV cosmetics cache cleared');
    }
}
exports.SevenTVService = SevenTVService;
//# sourceMappingURL=SevenTVService.js.map