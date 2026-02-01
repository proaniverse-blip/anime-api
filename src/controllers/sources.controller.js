import ProviderFactory from "../providers/ProviderFactory.js";
import { getCachedData, setCachedData } from "../helper/cache.helper.js";

export const getSources = async (req, res) => {
    try {
        const { animeId, episodeId } = req.params;
        const server = req.query.server;
        const type = req.query.type;
        const providerName = req.query.provider || 'hianime';

        const cacheKey = `sources:${providerName}:${animeId}:${episodeId}:${server}:${type}`;
        const cachedData = await getCachedData(cacheKey);
        if (cachedData) return cachedData;

        const provider = ProviderFactory.getProvider(providerName);

        // First, get anime info to retrieve the full episode ID with token
        const animeInfo = await provider.getAnimeInfo(animeId);

        if (!animeInfo || !animeInfo.episodes) {
            return { error: "Anime information not found" };
        }

        // Find the episode with the matching episode number
        const episode = animeInfo.episodes.find(ep => ep.number === parseInt(episodeId));

        if (!episode) {
            return { error: `Episode ${episodeId} not found` };
        }

        // Use the full episode ID (which includes the token)
        const streamingInfo = await provider.getStreamingLinks(episode.id, server, type);

        setCachedData(cacheKey, streamingInfo, 1800); // 30 mins

        return streamingInfo;
    } catch (e) {
        console.error(e);
        return { error: e.message };
    }
};
