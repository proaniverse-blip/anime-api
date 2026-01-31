import ProviderFactory from "../providers/ProviderFactory.js";
import { getCachedData, setCachedData } from "../helper/cache.helper.js";

export const getCategory = async (req, res, routeType) => {
  if (routeType === "genre/martial-arts") {
    routeType = "genre/marial-arts";
  }

  const providerName = req.query.provider || 'hianime';
  const requestedPage = parseInt(req.query.page) || 1;
  const cacheKey = `category:${providerName}:${routeType}:${requestedPage}`;

  try {
    const cachedResponse = await getCachedData(cacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }

    const provider = ProviderFactory.getProvider(providerName);
    // Note: Provider expects just the category name/type
    const { data, totalPages } = await provider.getCategory(routeType, requestedPage);

    if (requestedPage > totalPages && totalPages > 0) {
      const error = new Error("Requested page exceeds total available pages.");
      error.status = 404;
      throw error;
    }

    const responseData = { totalPages: totalPages, data: data };

    // Cache for 3 hours (genres don't change often)
    setCachedData(cacheKey, responseData, 10800);

    return responseData;
  } catch (e) {
    console.error(e);
    return e;
  }
};
