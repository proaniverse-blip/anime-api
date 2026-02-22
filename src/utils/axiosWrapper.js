import { gotScraping } from 'got-scraping';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { HttpProxyAgent } from 'http-proxy-agent';

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

// Initialize proxy agents on boot
const proxyUrlStr = process.env.PROXY_URLS || process.env.PROXY_URL; // e.g. http://ip:port,http://ip2:port
let proxyAgents = [];

if (proxyUrlStr) {
    const urls = proxyUrlStr.split(',').map(url => url.trim()).filter(url => url);
    proxyAgents = urls.map(url => url);
}

// Convert Axios request headers/options to got-scraping options
const convertAxiosToGot = (url, options = {}) => {
    const gotOptions = {
        url,
        method: options.method || 'GET',
        headers: { ...(options.headers || {}) },
        retry: { limit: 2 }, // Add basic retry
        timeout: { request: options.timeout || 15000 },
        throwHttpErrors: false, // Axios throws by default, but we'll handle it manually so we get the response object
        responseType: options.responseType === 'arraybuffer' ? 'buffer'
            : options.responseType === 'stream' ? undefined
                : 'text',
    };

    // If User-Agent is missing or generic, randomize it
    const currentUserAgent = gotOptions.headers['User-Agent'] || gotOptions.headers['user-agent'];
    if (!currentUserAgent || currentUserAgent.includes("axios")) {
        gotOptions.headers['User-Agent'] = getRandomElement(userAgents);
    } else {
        gotOptions.headers['User-Agent'] = getRandomElement(userAgents);
    }

    if (!gotOptions.headers['Accept-Language']) {
        gotOptions.headers['Accept-Language'] = 'en-US,en;q=0.9';
    }

    // Set up Proxy Array Rotation
    if (proxyAgents.length > 0) {
        gotOptions.proxyUrl = getRandomElement(proxyAgents);
    }

    // Handle payload for POST requests
    if (options.data) {
        if (typeof options.data === 'string') {
            gotOptions.body = options.data;
        } else {
            gotOptions.json = options.data;
        }
    }

    return gotOptions;
};

// Map the got response to look exactly like an Axios response
const mapGotResponseToAxios = (gotResponse, responseType) => {
    let data = gotResponse.body;

    // Auto-parse JSON if not arraybuffer
    if (responseType !== 'arraybuffer' && typeof data === 'string') {
        try {
            data = JSON.parse(data);
        } catch (e) {
            // It's just text
        }
    }

    const axiosLikeResponse = {
        data: data,
        status: gotResponse.statusCode,
        statusText: gotResponse.statusMessage,
        headers: gotResponse.headers,
        request: gotResponse.request,
        config: gotResponse.request.options
    };

    if (gotResponse.statusCode >= 400) {
        const error = new Error(`Request failed with status code ${gotResponse.statusCode}`);
        error.response = axiosLikeResponse;
        error.isAxiosError = true;
        throw error;
    }

    return axiosLikeResponse;
};

// Main wrapper interface mimicking Axios
const axiosWrapper = async (urlOrConfig, config = {}) => {
    let url = typeof urlOrConfig === 'string' ? urlOrConfig : urlOrConfig.url;
    let options = typeof urlOrConfig === 'string' ? config : urlOrConfig;

    const gotOptions = convertAxiosToGot(url, options);
    const response = await gotScraping(gotOptions);
    return mapGotResponseToAxios(response, options.responseType);
};

// Expose standard Axios methods
axiosWrapper.get = async (url, config = {}) => axiosWrapper(url, { ...config, method: 'GET' });
axiosWrapper.post = async (url, data, config = {}) => axiosWrapper(url, { ...config, method: 'POST', data });
axiosWrapper.put = async (url, data, config = {}) => axiosWrapper(url, { ...config, method: 'PUT', data });
axiosWrapper.delete = async (url, config = {}) => axiosWrapper(url, { ...config, method: 'DELETE' });
axiosWrapper.patch = async (url, data, config = {}) => axiosWrapper(url, { ...config, method: 'PATCH', data });

// To maintain interceptor signatures so code using it doesn't break
axiosWrapper.interceptors = {
    request: { use: () => { } },
    response: { use: () => { } }
};
axiosWrapper.defaults = {
    headers: { common: {} }
};

export default axiosWrapper;
