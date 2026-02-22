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

// Interceptor manager mock
class InterceptorManager {
    constructor() {
        this.handlers = [];
    }
    use(fulfilled, rejected) {
        this.handlers.push({ fulfilled, rejected });
        return this.handlers.length - 1;
    }
    eject(id) {
        if (this.handlers[id]) {
            this.handlers[id] = null;
        }
    }
}

// Factory to create Axios-like instances
const createInstance = (instanceConfig = {}) => {
    const instance = async (urlOrConfig, config = {}) => {
        let url = typeof urlOrConfig === 'string' ? urlOrConfig : urlOrConfig.url;
        let options = typeof urlOrConfig === 'string' ? config : urlOrConfig;

        // Merge defaults
        const finalOptions = { ...instance.defaults, ...options };
        if (instance.defaults.baseURL && !url.startsWith('http')) {
            // Very basic baseURL resolution
            url = `${instance.defaults.baseURL.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
        }

        let gotOptions = convertAxiosToGot(url, finalOptions);

        // Execute request interceptors
        for (const handler of instance.interceptors.request.handlers) {
            if (handler) {
                try {
                    gotOptions = await handler.fulfilled(gotOptions) || gotOptions;
                } catch (e) {
                    if (handler.rejected) await handler.rejected(e);
                    throw e;
                }
            }
        }

        try {
            const response = await gotScraping(gotOptions);
            let axiosResponse = mapGotResponseToAxios(response, finalOptions.responseType);

            // Execute response interceptors
            for (const handler of instance.interceptors.response.handlers) {
                if (handler) {
                    axiosResponse = await handler.fulfilled(axiosResponse) || axiosResponse;
                }
            }
            return axiosResponse;
        } catch (error) {
            // Execute response error interceptors
            for (const handler of instance.interceptors.response.handlers) {
                if (handler && handler.rejected) {
                    return await handler.rejected(error);
                }
            }
            throw error;
        }
    };

    instance.defaults = { headers: { common: {} }, ...instanceConfig };
    instance.interceptors = {
        request: new InterceptorManager(),
        response: new InterceptorManager()
    };

    instance.get = async (url, config = {}) => instance(url, { ...config, method: 'GET' });
    instance.post = async (url, data, config = {}) => instance(url, { ...config, method: 'POST', data });
    instance.put = async (url, data, config = {}) => instance(url, { ...config, method: 'PUT', data });
    instance.delete = async (url, config = {}) => instance(url, { ...config, method: 'DELETE' });
    instance.patch = async (url, data, config = {}) => instance(url, { ...config, method: 'PATCH', data });

    // Support axios(config) syntax directly
    instance.request = instance;

    return instance;
};

// Create the default global instance
const axiosWrapper = createInstance();

// Add the create method to the global instance
axiosWrapper.create = (instanceConfig) => {
    return createInstance(instanceConfig);
};

export default axiosWrapper;
