import ProviderFactory from "../providers/ProviderFactory.js";
import { getCachedData, setCachedData } from "../helper/cache.helper.js";

export const getStreamInfo = async (req, res, fallback = false) => {
  try {
    const input = req.query.id;
    const server = req.query.server;
    const type = req.query.type;
    const providerName = req.query.provider || 'hianime';

    let episodeId = input;
    // Handle old format where id might be a URL or contain params
    // But HiAnime provider likely expects just the ID
    const match = input.match(/ep=(\d+)/);
    if (match) {
      episodeId = match[1]; // Wait, original code extracted just the number?
      // original: const finalId = match[1]; -> extractStreamingInfo(finalId...)
      // HiAnimeProvider.getStreamingLinks expects episodeId. 
      // If HiAnime uses query params in ID, I should be careful.
      // HiAnimeProvider.getStreamingLinks: const id = episodeId; ... id.split("?ep=").pop()
    }

    const cacheKey = `stream:${providerName}:${episodeId}:${server}:${type}`;
    const cachedData = await getCachedData(cacheKey);
    if (cachedData) return cachedData;

    const provider = ProviderFactory.getProvider(providerName);
    // Note: getStreamingLinks signature in BaseProvider: (episodeId, server, category)
    // category matches type (sub/dub/raw)
    const streamingInfo = await provider.getStreamingLinks(input, server, type);

    setCachedData(cacheKey, streamingInfo, 1800); // 30 mins

    return streamingInfo;
  } catch (e) {
    console.error(e);
    return { error: e.message };
  }
};
