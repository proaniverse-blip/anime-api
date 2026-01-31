import ProviderFactory from "../providers/ProviderFactory.js";

export const getRecentEpisodes = async (req, res) => {
    const providerName = req.query.provider || 'hianime'; // Default to Anikai via factory
    const page = req.query.page || 1;

    try {
        const provider = ProviderFactory.getProvider(providerName);
        const data = await provider.getRecentEpisodes(page);
        return data;
    } catch (error) {
        console.error("Error fetching recent episodes:", error);
        return { results: [], error: error.message };
    }
};
