"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmoteService = void 0;
const axios_1 = __importDefault(require("axios"));
class EmoteService {
    constructor() {
        this.KICK_API_BASE = 'https://kick.com/api/v2';
        this.globalEmotesCache = [];
        this.channelEmotesCache = new Map();
        this.kickUserIdCache = new Map();
    }
    async loadChannelEmotes(channelName) {
        try {
            await this.loadGlobalEmotes();
            const channelEmotes = await this.loadChannelSpecificEmotes(channelName);
            const allEmotes = [...this.globalEmotesCache, ...channelEmotes];
            console.log(`Loaded ${allEmotes.length} total emotes for ${channelName} (${this.globalEmotesCache.length} global, ${channelEmotes.length} channel)`);
            return allEmotes;
        }
        catch (error) {
            console.error(`Failed to load emotes for ${channelName}:`, error);
            return this.globalEmotesCache;
        }
    }
    async loadGlobalEmotes() {
        if (this.globalEmotesCache.length > 0) {
            return;
        }
        try {
            console.log('Loading 7TV global emotes...');
            const response = await axios_1.default.get('https://7tv.io/v3/emote-sets/global');
            const data = response.data;
            this.globalEmotesCache = data.emotes.map((emote) => ({
                name: emote.name,
                url: this.buildEmoteUrl(emote.data.host.url, emote.data.animated),
                type: 'global',
                animated: emote.data.animated || false
            }));
            console.log(`Loaded ${this.globalEmotesCache.length} global 7TV emotes`);
        }
        catch (error) {
            console.error('Failed to load global 7TV emotes:', error);
            this.globalEmotesCache = [];
        }
    }
    async loadChannelSpecificEmotes(channelName) {
        const cached = this.channelEmotesCache.get(channelName);
        if (cached) {
            return cached;
        }
        try {
            const kickUserId = await this.getKickUserId(channelName);
            if (!kickUserId) {
                console.log(`No Kick user ID found for ${channelName}`);
                return [];
            }
            const response = await axios_1.default.get(`https://7tv.io/v3/users/kick/${kickUserId}`);
            const data = response.data;
            if (!data.emote_set?.emotes) {
                console.log(`${channelName} has no 7TV emote set`);
                this.channelEmotesCache.set(channelName, []);
                return [];
            }
            const channelEmotes = data.emote_set.emotes.map((emote) => ({
                name: emote.name,
                url: this.buildEmoteUrl(emote.data.host.url, emote.data.animated),
                type: 'channel',
                animated: emote.data.animated || false
            }));
            this.channelEmotesCache.set(channelName, channelEmotes);
            console.log(`Loaded ${channelEmotes.length} channel emotes for ${channelName}`);
            return channelEmotes;
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error) && error.response?.status === 404) {
                console.log(`${channelName} not linked to 7TV`);
            }
            else {
                console.error(`Failed to load channel emotes for ${channelName}:`, error);
            }
            this.channelEmotesCache.set(channelName, []);
            return [];
        }
    }
    async getKickUserId(username) {
        const cached = this.kickUserIdCache.get(username);
        if (cached) {
            return cached;
        }
        try {
            const response = await axios_1.default.get(`${this.KICK_API_BASE}/channels/${username}`);
            const userId = response.data.user_id || response.data.user?.id;
            if (userId) {
                const userIdStr = userId.toString();
                this.kickUserIdCache.set(username, userIdStr);
                return userIdStr;
            }
            return null;
        }
        catch (error) {
            console.error(`Failed to get Kick user ID for ${username}:`, error);
            return null;
        }
    }
    buildEmoteUrl(hostUrl, animated) {
        const baseUrl = `https:${hostUrl}`;
        return animated ? `${baseUrl}/1x.gif` : `${baseUrl}/1x.webp`;
    }
    parseMessageEmotes(content, channelName) {
        let parsedContent = content;
        const globalEmotes = this.globalEmotesCache;
        const channelEmotes = this.channelEmotesCache.get(channelName) || [];
        const allEmotes = [...globalEmotes, ...channelEmotes];
        allEmotes.forEach(emote => {
            const regex = new RegExp(`\\b${this.escapeRegExp(emote.name)}\\b`, 'g');
            const emoteClass = `emote seventv-emote ${emote.type}-emote ${emote.animated ? 'animated' : 'static'}`;
            const emoteHtml = `<img src="${emote.url}" class="${emoteClass}" alt="${emote.name}" title="${emote.name} (7TV ${emote.type})" loading="lazy">`;
            parsedContent = parsedContent.replace(regex, emoteHtml);
        });
        return parsedContent;
    }
    parseKickEmotes(content) {
        const emoteRegex = /\[emote:(\d+):(\w+)\]/g;
        return content.replace(emoteRegex, (match, emoteId, emoteName) => {
            const emoteUrl = `https://files.kick.com/emotes/${emoteId}/fullsize`;
            return `<img src="${emoteUrl}" class="emote kick-emote" alt="${emoteName}" title="${emoteName}" loading="lazy">`;
        });
    }
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    getAllEmotesForChannel(channelName) {
        const channelEmotes = this.channelEmotesCache.get(channelName) || [];
        return [...this.globalEmotesCache, ...channelEmotes];
    }
    clearChannelCache(channelName) {
        this.channelEmotesCache.delete(channelName);
        this.kickUserIdCache.delete(channelName);
    }
    clearAllCaches() {
        this.globalEmotesCache = [];
        this.channelEmotesCache.clear();
        this.kickUserIdCache.clear();
        console.log('All emote caches cleared');
    }
    getCacheStats() {
        return {
            globalEmotes: this.globalEmotesCache.length,
            channelCaches: this.channelEmotesCache.size,
            userIdCaches: this.kickUserIdCache.size
        };
    }
}
exports.EmoteService = EmoteService;
//# sourceMappingURL=EmoteService.js.map