/**
 * Base Anime Provider Interface
 * All providers must extend this class and implement its methods.
 */
class BaseProvider {
    constructor(name, baseUrl) {
        if (this.constructor === BaseProvider) {
            throw new Error("Abstract class 'BaseProvider' cannot be instantiated directly.");
        }
        this.name = name;
        this.baseUrl = baseUrl;
    }

    /**
     * Search for anime
     * @param {string} query - Search query
     * @param {number} page - Page number
     * @returns {Promise<any>}
     */
    async search(query, page = 1) {
        throw new Error("Method 'search' must be implemented.");
    }

    /**
     * Get anime details
     * @param {string} id - Anime ID
     * @returns {Promise<any>}
     */
    async getAnimeInfo(id) {
        throw new Error("Method 'getAnimeInfo' must be implemented.");
    }

    /**
     * Get episodes for an anime
     * @param {string} id - Anime ID
     * @returns {Promise<any>}
     */
    async getEpisodes(id) {
        throw new Error("Method 'getEpisodes' must be implemented.");
    }

    /**
     * Get streaming servers for an episode
     * @param {string} episodeId - Episode ID
     * @returns {Promise<any>}
     */
    async getServers(episodeId) {
        throw new Error("Method 'getServers' must be implemented.");
    }

    /**
     * Get streaming sources/links
     * @param {string} episodeId - Episode ID
     * @param {string} server - Server name (optional)
     * @param {string} category - Category (sub/dub/raw) (optional)
     * @returns {Promise<any>}
     */
    async getStreamingLinks(episodeId, server, category) {
        throw new Error("Method 'getStreamingLinks' must be implemented.");
    }

    /**
     * Get home page info (optional)
     * @returns {Promise<any>}
     */
    async getHomeInfo() {
        return {
            spotlight: [],
            trending: [],
            latestEpisode: [],
            topUpcoming: [],
            topAiring: [],
            mostPopular: [],
            mostFavorite: [],
            completed: [],
            genres: []
        };
    }
}

export default BaseProvider;
