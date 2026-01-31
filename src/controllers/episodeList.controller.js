import ProviderFactory from "../providers/ProviderFactory.js";
import { getCachedData, setCachedData } from "../helper/cache.helper.js";

export const getEpisodes = async (req, res) => {
  const { id } = req.params;
  const providerName = req.query.provider || 'hianime';
  const cacheKey = `episodes:${providerName}:${id}`;

  try {
    const cachedResponse = await getCachedData(cacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }

    const provider = ProviderFactory.getProvider(providerName);
    const data = await provider.getEpisodes(id);

    // Cache for 15 minutes
    setCachedData(cacheKey, data, 900);

    return data;
  } catch (e) {
    console.error("Error fetching episodes:", e);
    throw e;
  }
};
