import ProviderFactory from "../providers/ProviderFactory.js";
import { getCachedData, setCachedData } from "../helper/cache.helper.js";

export const getSources = async (req, res) => {
    try {
        const { animeId, episodeId } = req.params;
        const server = req.query.server;
        const type = req.query.type || req.query.category;

        // Auto-detect provider based on episode ID format
        let providerName = req.query.provider;
        if (!providerName && episodeId.includes('$token=')) {
            providerName = 'anikai';
        } else {
            providerName = providerName || 'hianime';
        }

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
        let episode = animeInfo.episodes.find(ep => ep.number === parseInt(episodeId));

        // If not found by number, check if the episodeId itself matches an ID in the list
        if (!episode) {
            episode = animeInfo.episodes.find(ep => ep.id === episodeId);
        }

        // If still not found, and the episodeId looks like a valid ID (not just a number), use it directly
        // This supports cases where the client sends the full ID
        const targetEpisodeId = episode ? episode.id : episodeId;


        // Use the full episode ID (which includes the token)
        const streamingInfo = await provider.getStreamingLinks(targetEpisodeId, server, type);

        setCachedData(cacheKey, streamingInfo, 1800); // 30 mins

        return streamingInfo;
    } catch (e) {
        console.error(e);
        return { error: e.message };
    }
};
