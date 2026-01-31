import ProviderFactory from "../providers/ProviderFactory.js";
import { getCachedData, setCachedData } from "../helper/cache.helper.js";

export const search = async (req) => {
  try {
    const providerName = req.query.provider || 'hianime';
    const provider = ProviderFactory.getProvider(providerName);

    // Create a deterministic cache key from query params
    const cacheKey = `search:${providerName}:${JSON.stringify(req.query)}`;

    const cachedData = await getCachedData(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    // Pass the keyword string, not the entire object
    const { keyword, page } = req.query;
    if (!keyword) throw new Error("Keyword is required");

    const data = await provider.search(keyword, page);

    if (data.results.length > 0) {
      // Cache search results for 30 minutes
      setCachedData(cacheKey, data, 1800);
    }

    // Adapting the response to match the old format [totalPage, results]
    // The provider returns { totalPages, results }
    return {
      data: data.results,
      totalPage: data.totalPages
    };

  } catch (e) {
    console.error(e);
    if (e.status === 404) {
      throw e;
    }
    throw new Error("An error occurred while processing your request.");
  }
};
