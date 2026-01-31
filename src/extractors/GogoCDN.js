import axios from 'axios';
import * as cheerio from 'cheerio';
import CryptoJS from 'crypto-js';

const keys = {
    key: CryptoJS.enc.Utf8.parse('37911490979715163134003223491201'),
    second_key: CryptoJS.enc.Utf8.parse('54674138327930866480207815084989'),
    iv: CryptoJS.enc.Utf8.parse('3134003223491201'),
};

class GogoCDN {
    constructor() {
        this.name = 'GogoCDN';
    }

    async extract(videoUrl) {
        try {
            if (videoUrl.includes('otakuvid') || videoUrl.includes('otakuhg')) { // OtakuVid routing
                // Check if it is the "embed" type which implies OtakuVid logic
                if (videoUrl.includes('otakuvid')) return this.extractOtakuVid(videoUrl);
                // If it is otakuhg (GogoCDN), fall through to normal logic
            }

            const res = await axios.get(videoUrl);
            const $ = cheerio.load(res.data);

            // 1. Check for AES Decryption (Old Method)
            const scriptData = $('script[data-name="episode"]').attr('data-value');
            if (scriptData) {
                return await this.extractAES(scriptData, videoUrl);
            }

            // 2. Check for Packer (New Method)
            let packedScript = '';
            $('script').each((i, el) => {
                const content = $(el).html() || '';
                if (content.includes('eval(function(p,a,c,k,e,d)')) {
                    packedScript = content;
                }
            });

            if (packedScript) {
                return this.extractPacker(packedScript);
            }

            return { sources: [] };

        } catch (err) {
            console.error('GogoCDN Extraction Failed:', err.message);
            return { sources: [] };
        }
    }

    async extractAES(scriptData, videoUrl) {
        const decryptedId = CryptoJS.AES.decrypt(scriptData, keys.key, { iv: keys.iv }).toString(CryptoJS.enc.Utf8);
        const encryptedId = CryptoJS.AES.encrypt(decryptedId, keys.key, { iv: keys.iv }).toString();
        const alias = decryptedId;

        const parsedUrl = new URL(videoUrl);
        const ajaxUrl = `https://${parsedUrl.hostname}/encrypt-ajax.php`;

        const ajaxRes = await axios.get(ajaxUrl, {
            params: {
                id: encryptedId,
                alias: alias
            },
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': videoUrl
            }
        });

        if (!ajaxRes.data.data) return { sources: [] };

        const decryptedData = CryptoJS.AES.decrypt(ajaxRes.data.data, keys.second_key, { iv: keys.iv }).toString(CryptoJS.enc.Utf8);
        const data = JSON.parse(decryptedData);

        const sources = data.source.map(source => ({
            url: source.file,
            isM3U8: source.file.includes('.m3u8'),
            quality: 'default'
        }));

        if (data.source_bk) {
            data.source_bk.forEach(source => {
                sources.push({
                    url: source.file,
                    isM3U8: source.file.includes('.m3u8'),
                    quality: 'backup'
                });
            });
        }

        return { sources };
    }

    extractPacker(packedScript) {
        // Simple unpacker for Dean Edwards Packer
        try {
            // Extract the arguments
            const args = packedScript.match(/}\('(.*)',(\d+),(\d+),'(.*)'\.split\('\|'\)/);
            if (!args) return { sources: [] };

            let p = args[1];
            const a = parseInt(args[2]);
            const c = parseInt(args[3]);
            const k = args[4].split('|');

            // Logic from the packer itself
            // while(c--)if(k[c])p=p.replace(new RegExp('\\b'+c.toString(a)+'\\b','g'),k[c]);

            // Reimplementation
            for (let i = c - 1; i >= 0; i--) {
                if (k[i]) {
                    const pattern = new RegExp('\\b' + i.toString(a) + '\\b', 'g');
                    p = p.replace(pattern, k[i]);
                }
            }

            // Extract links object
            // var links={...}
            const linkMatch = p.match(/var links\s*=\s*({.*?});/);
            const sources = [];

            if (linkMatch) {
                const links = JSON.parse(linkMatch[1]);
                // Smart Key Detection: Iterate all keys to find valid m3u8 links
                for (const key in links) {
                    const val = links[key];
                    if (typeof val === 'string' && (val.includes('.m3u8') || val.includes('.mp4'))) {
                        sources.push({
                            url: val,
                            type: val.includes('.m3u8') ? 'hls' : 'mp4',
                            quality: key.includes('bk') || key.includes('backup') ? 'backup' : 'default'
                        });
                    }
                }
            }

            // Hail Mary Scan on Unpacked Code if no sources found
            if (sources.length === 0) {
                const rawMatches = p.match(/https?:\/\/[^"']+\.m3u8[^"']*/g);
                if (rawMatches) {
                    rawMatches.forEach(url => {
                        if (!sources.find(s => s.url === url)) {
                            sources.push({ url, type: 'hls', quality: 'auto' });
                        }
                    });
                }
            }

            // Deduplicate
            const uniqueSources = [];
            const seen = new Set();
            sources.forEach(s => {
                if (!seen.has(s.url)) {
                    seen.add(s.url);
                    uniqueSources.push(s);
                }
            });

            return { sources: uniqueSources };

        } catch (e) {
            console.error('Packer Unpacking Error:', e);
            return { sources: [] };
        }
    }

    async extractOtakuVid(videoUrl) {
        try {
            const res = await axios.get(videoUrl);
            const html = res.data;
            let packedScript = '';

            if (html.includes('eval(function(p,a,c,k,e,d)')) {
                const match = html.match(/eval\(function\(p,a,c,k,e,d\).*?\.split\('\|'\)\)\)/);
                if (match) packedScript = match[0];
            }

            if (!packedScript) return { sources: [] };

            // Unpack to find the redirect URL
            const args = packedScript.match(/}\('(.*)',(\d+),(\d+),'(.*)'\.split\('\|'\)/);
            if (!args) return { sources: [] };

            let p = args[1];
            const a = parseInt(args[2]);
            const c = parseInt(args[3]);
            const k = args[4].split('|');

            for (let i = c - 1; i >= 0; i--) {
                if (k[i]) {
                    const pattern = new RegExp('\\b' + i.toString(a) + '\\b', 'g');
                    p = p.replace(pattern, k[i]);
                }
            }

            // 1. Try to find 'var links = {...}' (Most reliable)
            const linkMatch = p.match(/var links\s*=\s*({.*?});/);
            if (linkMatch) {
                try {
                    const links = JSON.parse(linkMatch[1]);
                    // Prioritize hls3, then hls2, then file
                    const bestUrl = links.hls4 || links.hls3 || links.hls2 || links.file;

                    if (bestUrl) {
                        return {
                            sources: [{
                                url: bestUrl,
                                type: 'hls',
                                quality: 'backup'
                            }]
                        };
                    }
                } catch (e) { /* ignore JSON error */ }
            }

            // 2. Fallback: Search for 'file:' but be careful to avoid thumbnails
            // looking for m3u8 strictly if possible
            const fileMatches = p.matchAll(/file["']?\s*:\s*["']([^"']+)["']/g);
            for (const match of fileMatches) {
                const url = match[1];
                if (url.includes('.m3u8') || url.includes('.mp4')) {
                    const fullUrl = url.startsWith('http') ? url : new URL(url, videoUrl).href;
                    return {
                        sources: [{
                            url: fullUrl,
                            type: 'hls',
                            quality: 'backup'
                        }]
                    };
                }
            }

            // 3. Last catch: the old file match logic (dangerous)
            const fileMatch = p.match(/file["']?\s*:\s*["']([^"']+)["']/);
            if (!fileMatch) return { sources: [] };

            const relUrl = fileMatch[1];
            // Skip if it looks like a thumbnail or slide
            if (relUrl.includes('get_slides') || relUrl.includes('.jpg')) {
                return { sources: [] };
            }

            const fullUrl = relUrl.startsWith('http') ? relUrl : new URL(relUrl, videoUrl).href;

            // Follow the redirect to get the final m3u8
            const res2 = await axios.get(fullUrl, {
                headers: { 'Referer': videoUrl },
                maxRedirects: 5
            });

            // The redirect leads to an m3u8. 
            // Often res2.request.res.responseUrl works in node if populated.
            const finalUrl = res2.request?.res?.responseUrl || fullUrl;

            // Fallback: If response body looks like m3u8, use fullUrl
            if (res2.data && typeof res2.data === 'string' && res2.data.includes('#EXTM3U')) {
                return {
                    sources: [{
                        url: fullUrl,
                        type: 'hls',
                        quality: 'backup'
                    }]
                };
            }

            return {
                sources: [{
                    url: finalUrl,
                    type: 'hls',
                    quality: 'backup'
                }]
            };

        } catch (e) {
            console.error('OtakuVid Extraction Failed:', e.message);
            return { sources: [] };
        }
    }
}

export default GogoCDN;
