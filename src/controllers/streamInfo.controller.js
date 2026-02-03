import ProviderFactory from "../providers/ProviderFactory.js";
import { getCachedData, setCachedData } from "../helper/cache.helper.js";

export const getStreamInfo = async (req, res, fallback = false) => {
  try {
    const input = req.query.id;
    const server = req.query.server;
    const type = req.query.type || req.query.category;
    let providerName = req.query.provider;

    // Auto-detect provider based on ID format if not specified
    if (!providerName && input.includes('$token=')) {
      providerName = 'anikai';
    } else {
      providerName = providerName || 'hianime';
    }

    let episodeId = input;

    // We must pass the FULL input ID to the provider if it's a composite ID (Anikai/others)
    // The previous regex extraction logic breaks tokens in the ID


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
