import ProviderFactory from "../providers/ProviderFactory.js";
import { getCachedData, setCachedData } from "../helper/cache.helper.js";

export const getHomeInfo = async (req, res) => {
  const providerName = req.query.provider || 'hianime';
  const cacheKey = `homeInfo:${providerName}`;

  try {
    const cachedResponse = await getCachedData(cacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }

    const provider = ProviderFactory.getProvider(providerName);
    const responseData = await provider.getHomeInfo();

    // Cache home page for 30 minutes
    setCachedData(cacheKey, responseData, 1800);

    return responseData;
  } catch (fetchError) {
    console.error("Error fetching fresh data:", fetchError);
    return fetchError;
  }
};
