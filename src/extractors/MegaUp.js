import axios from 'axios';
import https from 'https';

class MegaUp {
    constructor() {
        this.serverName = 'MegaUp';
        this.apiBase = 'https://enc-dec.app/api';
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';

        // Performance: Use valid cache for tokens to avoid redudant calls
        this.tokenCache = new Map();

        // Performance: Use Keep-Alive agent to reuse connections
        this.client = axios.create({
            timeout: 10000,
            httpsAgent: new https.Agent({ keepAlive: true }),
            headers: {
                'User-Agent': this.userAgent,
                'Connection': 'keep-alive'
            }
        });
    }

    async GenerateToken(n) {
        // Check cache first
        if (this.tokenCache.has(n)) {
            return this.tokenCache.get(n);
        }

        try {
            const res = await this.client.get(`${this.apiBase}/enc-kai?text=${encodeURIComponent(n)}`);
            const token = res.data.result;

            // Cache it (expires in memory on restart, or we can limit size if needed)
            this.tokenCache.set(n, token);
            return token;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async DecodeIframeData(n) {
        try {
            const res = await this.client.post(`${this.apiBase}/dec-kai`, { text: n });
            return res.data.result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async Decode(n) {
        try {
            const res = await this.client.post(
                `${this.apiBase}/dec-mega`,
                {
                    text: n,
                    agent: this.userAgent,
                },
                { headers: { 'Content-Type': 'application/json' } }
            );
            return res.data.result;
        } catch (error) {
            console.error(error);
            throw new Error(error.message);
        }
    }

    async extract(videoUrl) {
        try {
            // videoUrl can be a string or URL object. handling both
            const href = (typeof videoUrl === 'string') ? videoUrl : videoUrl.href;

            const url = href.replace('/e/', '/media/');

            // Extract domain from URL for Referer/Origin
            const urlObj = new URL(url);
            const baseDomain = `${urlObj.protocol}//${urlObj.host}`;

            const res = await this.client.get(url, {
                headers: {
                    'Referer': baseDomain + '/',
                    'Origin': baseDomain,
                    'User-Agent': this.userAgent
                }
            });
            const decrypted = await this.Decode(res.data.result);

            const data = {
                sources: decrypted.sources.map((s) => ({
                    url: s.file,
                    isM3U8: s.file.includes('.m3u8') || s.file.endsWith('m3u8'),
                })),
                subtitles: decrypted.tracks ? decrypted.tracks.map((t) => ({
                    kind: t.kind,
                    url: t.file,
                    lang: t.label,
                })) : [],
                download: decrypted.download,
            };
            return data;
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

export default MegaUp;
