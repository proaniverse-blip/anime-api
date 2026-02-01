import ProviderFactory from "../providers/ProviderFactory.js";
import { getCachedData, setCachedData } from "../helper/cache.helper.js";

export const getSources = async (req, res) => {
    try {
        const { animeId, episodeId } = req.params;
        const server = req.query.server;
        const type = req.query.type;
        const providerName = req.query.provider || 'hianime';

        // Construct the full episode ID in the format expected by the provider
        // Format: animeId$ep=episodeNumber$token=...
        // Since we have animeId and episodeId separately, we need to construct it
        const fullEpisodeId = `${animeId}$ep=${episodeId}`;

        const cacheKey = `sources:${providerName}:${animeId}:${episodeId}:${server}:${type}`;
        const cachedData = await getCachedData(cacheKey);
        if (cachedData) return cachedData;

        const provider = ProviderFactory.getProvider(providerName);
        const streamingInfo = await provider.getStreamingLinks(fullEpisodeId, server, type);

        setCachedData(cacheKey, streamingInfo, 1800); // 30 mins

        return streamingInfo;
    } catch (e) {
        console.error(e);
        return { error: e.message };
    }
};
