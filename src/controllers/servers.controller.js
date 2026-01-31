import ProviderFactory from "../providers/ProviderFactory.js";
import { getCachedData, setCachedData } from "../helper/cache.helper.js";

export const getServers = async (req) => {
  try {
    const { ep: episodeId, provider: providerName = 'hianime' } = req.query;
    // Note: HiAnime route was /api/servers/:id?ep=...
    // The previous controller used req.query.ep. Wait, route definition in apiRoutes.js:
    // createRoute("/api/servers/:id", serversController.getServers);
    // The previous implementation used `const { ep } = req.query;` but didn't use `req.params.id`.
    // It seems `ep` param is the actual episode ID for HiAnime.

    const id = req.params.id;
    // If ep is not provided, maybe use id?
    // Let's stick to what was working but add provider support.

    const finalEpisodeId = episodeId || id;

    const cacheKey = `servers:${providerName}:${finalEpisodeId}`;
    const cachedData = await getCachedData(cacheKey);
    if (cachedData) return cachedData;

    const provider = ProviderFactory.getProvider(providerName);
    const servers = await provider.getServers(finalEpisodeId);

    setCachedData(cacheKey, servers, 300); // 5 mins cache for servers

    return servers;
  } catch (e) {
    console.error(e);
    return e;
  }
};
