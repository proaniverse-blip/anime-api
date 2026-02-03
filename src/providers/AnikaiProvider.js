import axios from "axios";
import * as cheerio from "cheerio";
import BaseProvider from "./BaseProvider.js";
import MegaUp from "../extractors/MegaUp.js";

class AnikaiProvider extends BaseProvider {
    // List of active domains for fallback/rotation
    static DOMAINS = [
        'https://anikai.to',
        'https://animekai.to',
        'https://animekai.im',
        'https://animekai.la',
        'https://animekai.nl',
        'https://animekai.vc'
    ];

    constructor() {
        // Use first domain by default
        super('Anikai', AnikaiProvider.DOMAINS[0]);
        this.currentDomainIndex = 0;

        this.client = axios.create({
            baseURL: this.baseUrl,
            timeout: 15000,
            headers: this.getHeaders()
        });

        this.megaUp = new MegaUp();
        this.initializeAxios();
    }

    initializeAxios() {
        this.client.interceptors.response.use(
            response => response,
            async error => {
                const config = error.config;

                // If config does not exist or the retry option is set to false, reject
                if (!config || config.__isRetryRequest) {
                    return Promise.reject(error);
                }

                // Check for condition to retry: 5xx errors or Network Error
                // We avoid 404s as that might just be missing anime/page (unless site is returning 404 for everything)
                // But usually checking response.status >= 500 or !error.response (network err)
                const shouldRetry = !error.response || (error.response.status >= 500 && error.response.status < 600);

                if (shouldRetry) {
                    // setup retry count
                    config.__retryCount = config.__retryCount || 0;

                    // Check if we've tried all domains
                    if (config.__retryCount >= AnikaiProvider.DOMAINS.length) {
                        console.error('[Anikai] All domains failed.');
                        return Promise.reject(error);
                    }

                    config.__retryCount += 1;

                    // Cycle domain
                    console.error(`[Anikai] Request failed on ${this.baseUrl}. Switching domain...`);
                    this.cycleDomain();

                    // Update the config's baseURL to the new one
                    config.baseURL = this.baseUrl;
                    config.url = config.url; // url is relative usually, axios handles it with baseURL

                    // Slightly hacky: Axios merges config.baseURL and config.url. 
                    // If url was absolute, it ignores baseURL. Our code uses relative mostly.

                    // Important: update headers (referer)
                    config.headers = { ...config.headers, ...this.getHeaders() };

                    // Mark as retry
                    // We don't mark __isRetryRequest to true yet, so we can cycle through ALL domains. 
                    // We rely on __retryCount vs DOMAINS.length to stop.

                    console.log(`[Anikai] Retrying with ${this.baseUrl}`);
                    return this.client(config);
                }

                return Promise.reject(error);
            }
        );
    }

    // Mechanism to switch domain if allowed (manual or auto)
    setDomain(url) {
        this.baseUrl = url;
        this.client.defaults.baseURL = url;
        // Interceptor uses the client instance, so updating defaults affects next new requests.
        // For retries manually constructed, we updated 'config'.
    }

    cycleDomain() {
        this.currentDomainIndex = (this.currentDomainIndex + 1) % AnikaiProvider.DOMAINS.length;
        this.setDomain(AnikaiProvider.DOMAINS[this.currentDomainIndex]);
        console.log(`[Anikai] Switched to domain: ${this.baseUrl}`);
    }

    getHeaders() {
        return {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
            'Connection': 'keep-alive',
            'Accept': 'text/html, */*; q=0.01',
            'Accept-Language': 'en-US,en;q=0.5',
            'Sec-GPC': '1',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
            'Priority': 'u=0',
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache',
            'Referer': `${this.baseUrl}/`,
            // Cookie might need updates if domain changes?
            // Usually cookie is domain-bound, but for scraping 'guest' might work across all if shared backend.
            'Cookie': '__p_mov=1; usertype=guest; session=vLrU4aKItp0QltI2asH83yugyWDsSSQtyl9sxWKO',
        };
    }

    async search(query, page = 1) {
        if (page < 1) page = 1;
        const url = `${this.baseUrl}/browser?keyword=${encodeURIComponent(query)}&page=${page}`;
        return this.scrapeCardPage(url);
    }

    async getAnimeInfo(id) {
        try {
            const info = {
                id: id,
                title: '',
                url: `${this.baseUrl}/watch/${id}`,
                episodes: []
            };

            const { data } = await this.client.get(`/watch/${id}`);
            const $ = cheerio.load(data);

            info.title = $('.entity-scroll > .title').text();
            info.japaneseTitle = $('.entity-scroll > .title').attr('data-jp')?.trim();
            info.image = $('div.poster > div >img').attr('data-src') || $('div.poster > div >img').attr('src');
            info.description = $('.entity-scroll > .desc').text().trim();
            info.type = $('.entity-scroll > .info').children().last().text().toUpperCase();

            // Status, Season etc. logic from reference
            info.season = $('.entity-scroll > .detail').find("div:contains('Premiered') > span").text().trim();

            // Sub/Dub detection
            const hasSub = $('.entity-scroll > .info > span.sub').length > 0;
            const hasDub = $('.entity-scroll > .info > span.dub').length > 0;
            info.subOrDub = hasSub && hasDub ? 'both' : (hasDub ? 'dub' : 'sub');

            // Enhanced Metadata Extraction
            // Enhanced Metadata Extraction
            const detailContainer = $('.entity-scroll .detail');
            const getInfoItem = (label) => {
                let text = '';
                detailContainer.find('div').each((i, el) => {
                    const params = $(el).text().trim();
                    if (params.startsWith(`${label}:`)) {
                        text = params.replace(`${label}:`, '').trim();
                        // If it has "by X reviews" (Scores), clean it?
                        // User might want the raw text "9.29 by 1,089 reviews" or just score.
                        // Let's keep it simple or clean it if needed.
                    }
                });
                return text;
            };

            info.japanTitle = $('.entity-scroll .title').attr('data-jp') || "";
            info.synonyms = $('.al-title').text().trim();
            info.aired = getInfoItem('Date aired');
            info.premiered = getInfoItem('Premiered');
            info.duration = getInfoItem('Duration');
            info.status = getInfoItem('Status');
            info.malScore = getInfoItem('Scores');

            // Lists
            info.studios = [];
            detailContainer.find('div:contains("Studios:") a').each((i, el) => {
                info.studios.push($(el).text().trim());
            });

            info.producers = [];
            detailContainer.find('div:contains("Producers:") a').each((i, el) => {
                info.producers.push($(el).text().trim());
            });

            // Genres
            info.genres = [];
            // Use generic selector inside detail for Genres row
            detailContainer.find('div:contains("Genres:") a').each((i, el) => {
                info.genres.push($(el).text().trim());
            });

            // Description
            info.description = $('.entity-scroll .desc').text().trim();
            if (!info.description) info.description = $('.film-description').text().trim();

            // Fetch Episodes using AJAX and Token
            const ani_id = $('.rate-box#anime-rating').attr('data-id');
            if (ani_id) {
                const token = await this.megaUp.GenerateToken(ani_id);
                const episodesAjax = await this.client.get(
                    `/ajax/episodes/list?ani_id=${ani_id}&_=${token}`,
                    {
                        headers: {
                            ...this.getHeaders(),
                            'X-Requested-With': 'XMLHttpRequest',
                            'Referer': `${this.baseUrl}/watch/${id}`,
                        }
                    }
                );

                const $$ = cheerio.load(episodesAjax.data.result);

                info.episodes = [];
                $$('div.eplist > ul > li > a').each((i, el) => {
                    const el$ = $$(el);
                    const num = el$.attr('num');
                    const tokenAttr = el$.attr('token');

                    // Composite ID required for getServers to work later without re-fetching info? 
                    // Actually reference builds episodeId as: `${info.id}$ep=${num}$token=${tokenAttr}`
                    // We must follow this to allow correct parsing in getServers
                    const episodeId = `${info.id}$ep=${num}$token=${tokenAttr}`;

                    info.episodes.push({
                        id: episodeId,
                        number: parseInt(num),
                        title: el$.children('span').text().trim(),
                        url: `${this.baseUrl}/watch/${info.id}${el$.attr('href')}ep=${num}`,
                        isFiller: el$.hasClass('filler'),
                    });
                });
            }

            return info;

        } catch (err) {
            console.error('Anikai getAnimeInfo error:', err.message);
            throw new Error(err.message);
        }
    }

    async getEpisodes(id) {
        // BaseProvider expects just episodes array, or object with episodes? 
        // Existing providers usually return { episodes: [...] } or just [...]
        // BaseProvider definition implies returning Promise<any>. 
        // Usually robust implementations return full info or just episodes.
        // Let's call getAnimeInfo and return episodes to be safe and DRY.
        const info = await this.getAnimeInfo(id);
        return info.episodes;
    }

    async getServers(episodeId) {
        try {
            // episodeId format: "slug$ep=1$token=xyz"
            // Reference logic: 
            // if (!episodeId.startsWith(baseUrl + '/ajax')) -> construct it using token
            // episodeId.split('$token=')[1]

            let token = '';
            // Handle if simple ID passed (unlikely if we control getEpisodes) or composite
            if (episodeId.includes('$token=')) {
                token = episodeId.split('$token=')[1];
            } else {
                throw new Error("Invalid Episode ID format. Missing token.");
            }

            // Generate Verification Token for the request
            const verifyToken = await this.megaUp.GenerateToken(token);

            const url = `${this.baseUrl}/ajax/links/list?token=${token}&_=${verifyToken}`;

            const { data } = await this.client.get(url, { headers: this.getHeaders() });

            const $ = cheerio.load(data.result);
            const servers = [];

            // Iterate servers
            // Consumet implementation filters by sub/dub usage via separate fetchEpisodeServers calls
            // Here we want ALL servers.

            // Common selectors - Use broader selector to ensure we don't miss anything (like Dubs outside server-items)
            $('.server').each((i, el) => {
                const serverEl = $(el);
                const lid = serverEl.attr('data-lid');
                if (!lid) return; // Skip if no data-lid

                const name = serverEl.text().trim();

                // Try to find type from closest container with data-id
                const container = serverEl.closest('[data-id]');
                let type = container.attr('data-id') || 'sub';

                // Normalization
                if (type.toLowerCase().includes('soft')) type = 'softsub';
                else if (type.toLowerCase().includes('dub')) type = 'dub';
                else if (type.toLowerCase().includes('sub')) type = 'sub';

                servers.push({
                    name: `MegaUp ${name}`.trim(),
                    data_id: lid,
                    type: type
                });
            });

            return servers;
        } catch (err) {
            console.error('Anikai getServers error:', err.message);
            return [];
        }
    }

    async getStreamingLinks(episodeId) {
        try {
            // Fetch all available servers for this episode
            const servers = await this.getServers(episodeId);

            if (servers.length === 0) return { sources: [] };

            // Resolve ALL servers (User wants 6 links if there are 6 servers)
            const serverPromises = servers.map(async (server) => {
                try {
                    const lid = server.data_id;
                    const verifyToken = await this.megaUp.GenerateToken(lid);
                    const viewUrl = `${this.baseUrl}/ajax/links/view?id=${lid}&_=${verifyToken}`;
                    const { data } = await this.client.get(viewUrl, { headers: this.getHeaders() });
                    const decodedIframeData = await this.megaUp.DecodeIframeData(data.result);
                    const sources = await this.megaUp.extract(decodedIframeData.url);

                    // Return structured data for this specific server
                    return {
                        sources: sources.sources.map(s => ({
                            ...s,
                            type: server.type,
                            server: server.name // Include server name as requested ("full things")
                        })),
                        subtitles: sources.subtitles,
                        intro: decodedIframeData.skip?.intro,
                        outro: decodedIframeData.skip?.outro,
                        download: sources.download
                    };
                } catch (innerErr) {
                    console.error(`[Anikai] Failed to resolve server ${server.name} (${server.type}): ${innerErr.message}`);
                    return null;
                }
            });

            const results = await Promise.all(serverPromises);

            // Combine results
            const validResults = results.filter(r => r !== null);

            // Flatten sources from all servers
            const allSources = validResults.flatMap(r => r.sources);

            // Deduplicate sources if needed? User asked for "all", so maybe redundant links are okay if they from diff servers.
            // Often diff servers point to same file, but different LIDs might imply different routing/reliability. 
            // We keep them all as requested.

            const allSubtitles = validResults.find(r => r.subtitles?.length > 0)?.subtitles || [];
            const intro = validResults.find(r => r.intro)?.intro;
            const outro = validResults.find(r => r.outro)?.outro;
            const download = validResults.find(r => r.download)?.download;

            return {
                sources: allSources,
                subtitles: allSubtitles,
                intro,
                outro,
                download
                // Validating user request: "remove the server name,dataid,type from the response"
                // So we do NOT include the 'servers' key here.
            };

        } catch (err) {
            console.error('Anikai getStreamingLinks error:', err.message);
            return { sources: [] };
        }
    }

    async getHomeInfo() {
        try {
            console.log("[Anikai] Fetching Home Info...");
            const { data } = await this.client.get('/home');
            const $ = cheerio.load(data);

            const spotlights = [];
            $('#featured .swiper-slide').each((i, el) => {
                const slide = $(el);
                const title = slide.find('.title').text().trim();
                const description = slide.find('.desc').text().trim();
                const btn = slide.find('.watch-btn').attr('href'); // /watch/id
                const id = btn?.split('/watch/')[1];
                // Poster is in style="background-image: url(...)"
                const style = slide.attr('style') || "";
                const match = style.match(/url\((.*?)\)/);
                const poster = match ? match[1] : "";

                const sub = parseInt(slide.find('.sub').text()) || null;
                const dub = parseInt(slide.find('.dub').text()) || null;
                const eps = parseInt(slide.find('.eps').text()) || null;

                if (id) {
                    spotlights.push({
                        id, title, description, poster,
                        episodes: { sub, dub, eps },
                        url: `${this.baseUrl}/watch/${id}`
                    });
                }
            });

            const trending = [];
            // "Trending" on this template seems to be the "Top Trending" sidebar or "New Releases"
            // Let's use "Top Trending" (Day) as trending for now? Or "New Releases"?
            // Taking "Top Trending" (Day) as standard trending list.
            $('#trending-anime .aitem').each((i, el) => {
                const item = $(el);
                const title = item.find('.title').text().trim();
                const id = item.attr('href')?.split('/watch/')[1]?.split('#')[0]; // href="/watch/id"
                const style = item.attr('style') || "";
                const match = style.match(/url\((.*?)\)/);
                const poster = match ? match[1] : "";

                const sub = parseInt(item.find('.sub').text()) || null;
                const dub = parseInt(item.find('.dub').text()) || null;
                const eps = parseInt(item.find('.eps').text()) || null;

                if (id) trending.push({
                    id, title, poster,
                    episodes: { sub, dub, eps },
                    url: `${this.baseUrl}/watch/${id}`
                });
            });

            const latestEpisode = [];
            $('#latest-updates .aitem').each((i, item) => {
                const el = $(item);
                const title = el.find('.title').text().trim();
                const id = el.find('a.poster').attr('href')?.split('/watch/')[1]?.split('#')[0];
                const poster = el.find('img').attr('data-src') || el.find('img').attr('src');
                const type = el.find('.info span').last().text().trim(); // Last span is usually Type (TV/ONA)

                // Extraction of eps info
                const sub = parseInt(el.find('.sub').text()) || null;
                const dub = parseInt(el.find('.dub').text()) || null;
                const eps = parseInt(el.find('.eps').text()) || null; // Sometimes just single number if completed?

                if (id) {
                    latestEpisode.push({
                        id, title, poster, type,
                        episodes: { sub, dub, eps }
                    });
                }
            });

            return {
                spotlights,
                trending,
                latestEpisode,
                topUpcoming: [],
                mostPopular: [],
                mostFavorite: [],
                latestCompleted: [],
                genres: []
            };

        } catch (err) {
            console.error('Anikai getHomeInfo error:', err.message);
            return { spotlights: [], trending: [], latestEpisode: [] };
        }
    }

    async getTopTen() {
        try {
            const { data } = await this.client.get('/home');
            const $ = cheerio.load(data);

            const results = [];

            // Helper to scrape a specific tab pane
            const scrapeTab = (selector, period) => {
                // Selector: .top-anime[data-id="day"]
                $(selector).find('.aitem').each((i, el) => {
                    const item = $(el);
                    const rank = parseInt(item.find('.num').text());
                    const title = item.find('.title').text().trim();
                    const href = item.attr('href'); // /watch/id
                    const id = href?.split('/watch/')[1]?.split('#')[0];
                    const style = item.attr('style') || "";
                    const match = style.match(/url\((.*?)\)/);
                    const poster = match ? match[1] : "";

                    const sub = parseInt(item.find('.sub').text()) || null;
                    const dub = parseInt(item.find('.dub').text()) || null;
                    const eps = parseInt(item.find('.eps').text()) || null;

                    if (id) {
                        results.push({
                            id,
                            title,
                            poster,
                            period, // 'day', 'week', 'month'
                            rank,
                            episodes: { sub, dub, eps }
                        });
                    }
                });
            };

            scrapeTab('.top-anime[data-id="day"]', 'day');
            scrapeTab('.top-anime[data-id="week"]', 'week');
            scrapeTab('.top-anime[data-id="month"]', 'month');

            return results;
        } catch (err) {
            console.error('[Anikai] getTopTen error:', err.message);
            return [];
        }
    }

    async getRecentEpisodes(page = 1) {
        try {
            const { data } = await this.client.get(`/recent?page=${page}`);
            const $ = cheerio.load(data);
            const results = [];

            $('.aitem').each((i, item) => {
                const el = $(item);
                const title = el.find('.title').text().trim();
                const id = el.find('a.poster').attr('href')?.split('/watch/')[1]?.split('#')[0];
                const poster = el.find('img').attr('data-src') || el.find('img').attr('src');
                const type = el.find('.info span').last().text().trim();

                const sub = parseInt(el.find('.sub').text()) || null;
                const dub = parseInt(el.find('.dub').text()) || null;
                const eps = parseInt(el.find('.eps').text()) || null;

                if (id) {
                    results.push({
                        id, title, poster, type,
                        episodes: { sub, dub, eps }
                    });
                }
            });

            // Pagination check
            const hasNextPage = $('.pagination .next').length > 0;

            return {
                currentPage: page,
                hasNextPage,
                results
            };
        } catch (err) {
            console.error('[Anikai] getRecentEpisodes error:', err.message);
            return { currentPage: page, hasNextPage: false, results: [] };
        }
    }

    async getSchedule() {
        // Anikai usually has /schedule
        try {
            const { data } = await this.client.get('/schedule');
            const $ = cheerio.load(data);
            const schedule = [];
            // Generic scrape assumption
            return schedule;
        } catch (e) { return []; }
    }

    async getCategory(category, page = 1) {
        // Map category to URL
        // e.g. "movie" -> /movie?page=1, "tv" -> /tv ...
        // or "action" -> /genre/action

        let url = `${this.baseUrl}/${category}`;
        if (category.toLowerCase() === 'new-added') url = `${this.baseUrl}/recently-added`;
        else if (category.toLowerCase() === 'upcoming') url = `${this.baseUrl}/top-upcoming`;
        // Genre check?
        // simple heuristic: if it contains hyphen, maybe genre? 
        // Better: assume usage via the controller routes.

        // Let's assume standard mapped paths or construct URL.
        if (!url.includes('?')) url += `?page=${page}`;
        else url += `&page=${page}`;

        if (!['movie', 'tv', 'ova', 'ona', 'special', 'recently-added', 'top-upcoming'].includes(category)) {
            // Likely a genre
            url = `${this.baseUrl}/genre/${category}?page=${page}`;
        }

        return this.scrapeCardPage(url);
    }

    async getSearchSuggestions(query) {
        try {
            const { data } = await this.client.get(`${this.baseUrl}/ajax/search/suggest?keyword=${encodeURIComponent(query)}`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            // data.html usually maps to suggestions
            return []; // Implement parsing if needed
        } catch (e) { return []; }
    }

    // Helper for scraping card pages (Search, New Releases, etc)
    async scrapeCardPage(url) {
        try {
            const { data } = await this.client.get(url);
            const $ = cheerio.load(data);

            const results = [];
            $('.aitem').each((i, el) => {
                const card = $(el);
                const atag = card.find('div.inner > a'); // Reference selector
                // Fallback selector if structure differs slightly (search vs lists)
                // Reference uses .aitem directly sometimes?
                // Reference scrapeCard uses: $('.aitem').each... const atag = card.find('div.inner > a');

                // Let's support both structure seen in search results vs others if needed
                // But usually Anikai is consistent.

                const href = atag.attr('href') || card.attr('href');
                const id = href?.replace('/watch/', '');
                const title = atag.text().trim() || card.find('.title').text().trim();
                const image = card.find('img').attr('data-src') || card.find('img').attr('src');

                const type = card.find('.info').children().last().text().trim();
                const sub = parseInt(card.find('.info span.sub').text()) || 0;
                const dub = parseInt(card.find('.info span.dub').text()) || 0;

                if (id) {
                    results.push({
                        id,
                        title,
                        image,
                        url: `${this.baseUrl}${href}`,
                        type,
                        episodes: {
                            sub,
                            dub
                        }
                    });
                }
            });

            const pagination = $('ul.pagination');
            const hasNextPage = pagination.find('.page-item.active').next().find('a.page-link').length > 0;

            return {
                currentPage: parseInt(pagination.find('.page-item.active span.page-link').text()) || 1,
                hasNextPage,
                results
            };

        } catch (err) {
            console.error('Anikai scrapeCardPage error:', err.message);
            return { results: [] };
        }
    }
}

export default AnikaiProvider;
