import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.2; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15",
];

const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const setupAxios = () => {
    // Configure Proxy if env variable is set
    const proxyUrlStr = process.env.PROXY_URLS || process.env.PROXY_URL; // e.g. http://ip:port,http://ip2:port

    let proxyAgents = [];
    if (proxyUrlStr) {
        const urls = proxyUrlStr.split(',').map(url => url.trim()).filter(url => url);
        proxyAgents = urls.map(url => new HttpsProxyAgent(url));
        axios.defaults.proxy = false; // Disable default proxy handling globally
        console.log(`Successfully loaded ${proxyAgents.length} Proxy URL(s) for rotation.`);
    }

    // Set up default timeouts so requests don't hang indefinitely (optional but good practice)
    axios.defaults.timeout = 15000;

    // Apply interceptor
    axios.interceptors.request.use((config) => {
        // We only want to overwrite User-Agent to ensure Cloudflare doesn't block it
        if (!config.headers) {
            config.headers = {};
        }

        // Apply random proxy agent if available
        if (proxyAgents.length > 0) {
            config.httpsAgent = getRandomElement(proxyAgents);
        }

        // Override default axios user-agents or blank ones
        const currentUserAgent = config.headers['User-Agent'] || config.headers['user-agent'];
        if (!currentUserAgent || currentUserAgent.includes("axios")) {
            config.headers['User-Agent'] = getRandomElement(userAgents);
        } else {
            // Forcefully randomize as per requirements to rotate properly
            config.headers['User-Agent'] = getRandomElement(userAgents);
        }

        // Add typical browser headers to look more human-like to CDNs
        if (!config.headers['Accept-Language']) {
            config.headers['Accept-Language'] = 'en-US,en;q=0.9';
        }
        if (!config.headers['Accept']) {
            config.headers['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8';
        }

        return config;
    }, (error) => {
        return Promise.reject(error);
    });
};
