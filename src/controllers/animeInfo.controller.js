import ProviderFactory from "../providers/ProviderFactory.js";
import { getCachedData, setCachedData } from "../helper/cache.helper.js";

export const getAnimeInfo = async (req, res) => {
  const { id } = req.query;
  const providerName = req.query.provider || 'hianime';
  const cacheKey = `animeInfo:${providerName}:${id}`;

  try {
    const cachedResponse = await getCachedData(cacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }

    const provider = ProviderFactory.getProvider(providerName);
    const data = await provider.getAnimeInfo(id);

    // Cache for 30 minutes
    setCachedData(cacheKey, data, 1800);

    return data;
  } catch (e) {
    console.error(e);
    // Return error structure compatible with previous implementation if needed
    // But throwing allows the express error handler to pick it up
    throw e;
  }
};
