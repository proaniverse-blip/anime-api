
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

class BrowserTokenHelper {
    constructor() {
        this.browser = null;
        this.page = null;
        this.lastUsed = 0;
        this.timeout = 5 * 60 * 1000; // Close browser after 5 mins of inactivity
        this.timer = null;
    }

    async init() {
        if (!this.browser) {
            console.log("[BrowserHelper] Launching headless browser...");
            this.browser = await puppeteer.launch({
                headless: true, // Use legacy/standard headless for stability
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--window-size=1920,1080'
                ]
            });
            this.page = await this.browser.newPage();
            // Request interception removed for stability
        }
        this.resetTimer();
    }

    resetTimer() {
        if (this.timer) clearTimeout(this.timer);
        this.timer = setTimeout(() => this.close(), this.timeout);
    }

    async close() {
        if (this.browser) {
            console.log("[BrowserHelper] Closing inactive browser.");
            await this.browser.close();
            this.browser = null;
            this.page = null;
        }
    }

    /**
     * Navigate to a URL and return the page content (HTML).
     * @param {string} url 
     * @param {number} waitTimeMs Extra time to wait after load (for turnstile)
     */
    async getHtml(url) {
        await this.init();
        try {
            console.log(`[BrowserHelper] Navigating to: ${url}`);
            await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

            // Robust Wait for Trust
            let isTrusted = false;
            for (let i = 0; i < 30; i++) { // Wait up to 15s
                try {
                    const title = await this.page.title();
                    const content = await this.page.content();

                    if (title && title.length > 0 && !title.includes("Just a moment") && !content.includes("Verify you are human")) {
                        isTrusted = true;
                        console.log(`[BrowserHelper] Trust established. Title: "${title}"`);
                        break;
                    }

                    if (i === 5 || i === 15) {
                        // Click if stuck
                        const frames = this.page.frames();
                        const turnstileFrame = frames.find(f => f.url().includes('turnstile'));
                        if (turnstileFrame) await turnstileFrame.click('body').catch(() => { });
                    }
                } catch (e) { }
                await new Promise(r => setTimeout(r, 500));
            }

            return await this.page.content();
        } catch (e) {
            console.error(`[BrowserHelper] Error fetching ${url}:`, e.message);
            throw e;
        } finally {
            this.resetTimer();
        }
    }

    /**
     * Fetch JSON response by navigating to the API URL and extracting body text.
     * Useful for API endpoints protected by Cloudflare.
     * @param {string} url 
     */
    async getJson(url, referer = '', headers = {}) {
        await this.init();
        try {
            // Strategy: If referer provided, load that page first (to solve Turnstile), then fetch from context
            if (referer) {
                console.log(`[BrowserHelper] Priming session via: ${referer}`);
                await this.page.goto(referer, { waitUntil: 'domcontentloaded' });

                // Robust Wait: Poll until we are NOT on the challenge page
                let isTrusted = false;
                for (let i = 0; i < 30; i++) { // Wait up to 15s
                    try {
                        const title = await this.page.title();
                        const content = await this.page.content();

                        if (title && title.length > 0 && !title.includes("Just a moment") && !content.includes("Verify you are human")) {
                            isTrusted = true;
                            console.log(`[BrowserHelper] Trust established. Title: "${title}"`);
                            break;
                        }

                        // Try clicking if stuck
                        if (i === 5 || i === 15) {
                            console.log("[BrowserHelper] Attempting click...");
                            const frames = this.page.frames();
                            const turnstileFrame = frames.find(f => f.url().includes('turnstile'));
                            if (turnstileFrame) await turnstileFrame.click('body').catch(() => { });
                        }
                    } catch (e) {
                        // Ignore context errors during navigation
                    }
                    await new Promise(r => setTimeout(r, 500));
                }

                if (!isTrusted) console.warn("[BrowserHelper] Warning: Turnstile might not be solved.");

                // Perform fetch inside the browser context
                console.log(`[BrowserHelper] Fetching in-page: ${url}`);
                const data = await this.page.evaluate(async (targetUrl, reqHeaders) => {
                    try {
                        // Priority: Try jQuery if available (matches site stack)
                        if (window.jQuery) {
                            console.log("Using jQuery.ajax");
                            return new Promise((resolve, reject) => {
                                window.jQuery.ajax({
                                    url: targetUrl,
                                    headers: reqHeaders,
                                    success: (res) => resolve(res),
                                    error: (xhr) => resolve({
                                        status: xhr.status,
                                        message: xhr.statusText,
                                        responseText: xhr.responseText,
                                        isError: true
                                    })
                                });
                            });
                        }

                        // Fallback to native fetch
                        const resp = await fetch(targetUrl, {
                            headers: {
                                'X-Requested-With': 'XMLHttpRequest',
                                ...reqHeaders
                            }
                        });
                        return await resp.json();
                    } catch (e) {
                        return { status: 500, message: "Fetch Error: " + e.toString() };
                    }
                }, url, headers);

                return data;
            }

            // Direct navigation (fallback or no referer)
            console.log(`[BrowserHelper] Fetching direct JSON: ${url}`);
            await this.page.goto(url, { waitUntil: 'domcontentloaded' });
            const jsonText = await this.page.evaluate(() => document.body.innerText);
            try {
                return JSON.parse(jsonText);
            } catch (e) {
                console.error("[BrowserHelper] Failed to parse JSON:", jsonText.substring(0, 100));
                throw e;
            }

        } catch (e) {
            console.error(`[BrowserHelper] Error fetching JSON ${url}:`, e.message);
            // If in-page fetch fails, it might throw inside evaluate
            return { status: 500, message: e.message };
        } finally {
            this.resetTimer();
        }
    }

    /**
     * Get User-Agent and Cookies for external use (Hybrid mode)
     */
    async getClearance(url) {
        await this.init();
        await this.page.goto(url, { waitUntil: 'domcontentloaded' });
        await new Promise(r => setTimeout(r, 3000)); // Wait for challenge

        const cookies = await this.page.cookies();
        const ua = await this.page.evaluate(() => navigator.userAgent);

        const cf_clearance = cookies.find(c => c.name === 'cf_clearance')?.value;
        const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

        return {
            'User-Agent': ua,
            'Cookie': cookieString,
            'cf_clearance': cf_clearance
        };
    }
    async sniff(triggerUrl, urlPattern, options = {}) {
        await this.init();
        try {
            console.log(`[BrowserHelper] Sniffing for '${urlPattern}' on '${triggerUrl}'`);

            let sniffedUrl = null;
            const onResponse = (res) => {
                if (res.url().includes(urlPattern) && res.status() === 200) {
                    sniffedUrl = res.url();
                }
            };
            this.page.on('response', onResponse);

            let tempPage = null;

            // If we are navigating directly to an API endpoint (triggerUrl == sourceUrl), we might need headers.
            // But 'sniff' was originally designed to navigate to a page (trigger) and capturing a sub-request.
            // When used for Anikai Streaming with direct URL, we are using the MAIN navigation as the target.

            // To support custom headers (Referer) for the main navigation:
            if (options.referer) {
                await this.page.setExtraHTTPHeaders({ 'Referer': options.referer });
            }

            // Navigate
            await this.page.goto(triggerUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

            // Restore headers if needed (or just leave them, we reset session usually?)
            // Ideally we should clear them, but Singleton reuse makes it tricky.
            if (options.referer) {
                await this.page.setExtraHTTPHeaders({}); // Clear
            }

            // Robust Wait for Trust (wait for reload/turnstile completion)
            for (let i = 0; i < 30; i++) { // 30s max
                // If the triggerUrl ITSELF is the target (AJAX JSON), it helps to just check if we got it.
                if (sniffedUrl) break;

                // If page is JSON, it might not have title/content like a normal page.
                try {
                    const title = await this.page.title();
                    const content = await this.page.content();
                    if (title && title.length > 0 && !title.includes("Just a moment") && !content.includes("Verify")) {
                        // If we already have sniffedUrl, we can proceed.
                        if (sniffedUrl) break;
                    }

                    // Click turnstile if found
                    const frames = this.page.frames();
                    const turnstileFrame = frames.find(f => f.url().includes('turnstile'));
                    if (turnstileFrame) await turnstileFrame.click('body').catch(() => { });
                } catch (e) { }
                await new Promise(r => setTimeout(r, 1000));
            }

            // Clean listener
            if (this.page) this.page.off('response', onResponse);

            if (sniffedUrl) {
                console.log(`[BrowserHelper] Sniffed URL: ${sniffedUrl}`);
                try {
                    // Use a new page to isolate context and avoid navigation races
                    let tempPage = await this.browser.newPage();
                    try {
                        console.log("[BrowserHelper] Created temp page for extraction...");
                        await tempPage.goto(sniffedUrl, { waitUntil: 'networkidle0', timeout: 30000 });

                        // Try multiple ways to get content (Chrome wraps JSON in pre, or raw text)
                        let bodyText = await tempPage.evaluate(() => {
                            return document.body.innerText ||
                                (document.querySelector('pre') ? document.querySelector('pre').innerText : '') ||
                                document.documentElement.innerText;
                        });

                        console.log(`[BrowserHelper] Navigated. Body innerText length: ${bodyText ? bodyText.length : 'N/A'}`);

                        // Fallback to content if empty
                        if (!bodyText || bodyText.length < 5) {
                            console.log("[BrowserHelper] innerText empty, falling back to page.content()");
                            bodyText = await tempPage.content();
                            console.log(`[BrowserHelper] page.content length: ${bodyText ? bodyText.length : 'N/A'}`);
                        }

                        await tempPage.close();
                        try {
                            const json = JSON.parse(bodyText);
                            if (json && typeof json === 'object') {
                                json._sniffedUrl = sniffedUrl;
                            }
                            return json;
                        } catch (e) {
                            return { html: bodyText, _sniffedUrl: sniffedUrl };
                        }
                    } catch (e) {
                        if (tempPage) await tempPage.close().catch(() => { });
                        throw e; // Let outer catch handle logging
                    }


                } catch (e) {
                    console.error("[BrowserHelper] Direct nav fetch failed:", e.message);
                }
            } else {
                console.log(`[BrowserHelper] Target URL '${urlPattern}' not found during navigation.`);
            }

            return null;

        } catch (e) {
            console.error(`[BrowserHelper] Sniff Error pattern '${urlPattern}':`, e.message);
            // Return null so provider can try other methods or fail gracefully
            return null;
        } finally {
            this.resetTimer();
        }
    }

    async fetchJson(url, headers = {}, contextUrl = null) {
        if (!this.page) await this.init();

        try {
            if (contextUrl) {
                const currentUrl = this.page.url();
                if (currentUrl !== contextUrl) {
                    // Check if only query/hash changed (same origin and path)
                    const currObj = new URL(currentUrl);
                    const ctxObj = new URL(contextUrl);

                    if (currObj.origin === ctxObj.origin && currObj.pathname === ctxObj.pathname) {
                        console.log(`[BrowserHelper] Soft navigating to context: ${contextUrl}`);
                        try {
                            await this.page.evaluate((newUrl) => {
                                window.history.replaceState(null, '', newUrl);
                            }, contextUrl);
                            // Small delay to let browser register the state change internally
                            await new Promise(r => setTimeout(r, 500));
                        } catch (navErr) {
                            console.warn(`[BrowserHelper] Soft nav failed: ${navErr.message}. Falling back to hard nav.`);
                            await this.page.goto(contextUrl, { waitUntil: 'domcontentloaded' });
                        }
                    } else {
                        // Hard navigation
                        console.log(`[BrowserHelper] Navigating to context: ${contextUrl}`);
                        await this.page.goto(contextUrl, { waitUntil: 'domcontentloaded' });
                        // Simple wait or check title
                        await new Promise(r => setTimeout(r, 3000));
                    }
                }
            }

            // Use the existing page context to fetch (preserves cookies/session)
            // Use the existing page context to fetch (preserves cookies/session)
            // Retry logic for "Execution context destroyed"
            let data = null;
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    data = await this.page.evaluate(async (url, headers) => {
                        try {
                            const resp = await fetch(url, {
                                method: 'GET',
                                headers: headers
                            });
                            if (!resp.ok) return { error: resp.status, status: resp.status };
                            return await resp.json();
                        } catch (e) {
                            return { error: e.toString() };
                        }
                    }, url, headers);

                    if (data && !data.error) break; // Success
                    if (data && data.error && !data.error.includes('Execution context')) break; // Real error, don't retry context issues endlessly

                } catch (e) {
                    console.log(`[BrowserHelper] fetchJson attempt ${attempt + 1} failed: ${e.message}`);
                    if (attempt === 2) throw e;
                    await new Promise(r => setTimeout(r, 1000));
                }
            }

            return data;
        } catch (e) {
            console.error("[BrowserHelper] fetchJson failed:", e);
            return null;
        } finally {
            this.resetTimer();
        }
    }

    async clickAndSniff(selector, urlPattern) {
        if (!this.page) return null;

        try {
            console.log(`[BrowserHelper] Click & Sniff: '${selector}' -> '${urlPattern}'`);
            let sniffedData = null;

            // Promise to capture response
            const responsePromise = new Promise((resolve) => {
                const onResponse = async (res) => {
                    if (res.url().includes(urlPattern) && res.status() === 200) {
                        try {
                            const text = await res.text();
                            const json = JSON.parse(text);
                            resolve(json);
                        } catch (e) {
                            resolve({ html: await res.text() });
                        }
                        if (this.page) this.page.off('response', onResponse);
                    }
                };
                if (this.page) this.page.on('response', onResponse);

                // Safety timeout
                setTimeout(() => {
                    if (this.page) this.page.off('response', onResponse);
                    resolve(null);
                }, 10000);
            });

            // Perform click with robust check
            const element = await this.page.$(selector);
            if (!element) return null;
            await element.click();

            sniffedData = await responsePromise;
            return sniffedData;

        } catch (e) {
            console.error(`[BrowserHelper] ClickSniff Error: ${e.message}`);
            return null;
        } finally {
            this.resetTimer();
        }
    }

    /**
     * Navigates to a URL safely in a new page and captures a specific response.
     * Replaces sniffRequest and clickAndSniff for most cases.
     */
    async captureResponse(triggerUrl, urlPattern, options = {}) {
        if (!this.page) await this.init();

        const timeoutMs = options.timeout || 20000;

        try {
            console.log(`[BrowserHelper] Capture Response: '${urlPattern}' on '${triggerUrl}'`);
            const tempPage = await this.browser.newPage();

            // Set Headers if needed
            if (options.referer) {
                await tempPage.setExtraHTTPHeaders({ 'Referer': options.referer });
            }

            const capturePromise = new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    resolve(null);
                }, timeoutMs);

                const onResponse = async (res) => {
                    const url = res.url();

                    // 1. Check for specific 9anime/RapidCloud JSON (Primary goal for extractM3u8)
                    if (options.extractM3u8 && (url.includes('getSources') || url.includes('ajax/embed'))) {
                        try {
                            const json = await res.json();
                            // console.log(`[BrowserHelper] JSON content: ${JSON.stringify(json).substring(0, 100)}...`);
                            if (json.sources) {
                                const m3u8 = json.sources.find(s => s.file && s.file.includes('.m3u8'));
                                if (m3u8) {
                                    console.log(`[BrowserHelper] Extracted m3u8 from JSON: ${m3u8.file}`);
                                    resolve({ url: m3u8.file, match: url });
                                    return;
                                }
                            }
                        } catch (e) { }
                    }

                    // 2. Match pattern
                    if (url.includes(urlPattern)) {
                        console.log(`[BrowserHelper] Matched Response: ${url}`);
                        try {
                            // Standard JSON extraction
                            const contentType = res.headers()['content-type'] || '';
                            if (contentType.includes('application/json')) {
                                const json = await res.json();
                                resolve({ json, url });
                            } else if (url.includes('.m3u8')) {
                                resolve({ url });
                            } else {
                                resolve({ text: await res.text(), url });
                            }
                        } catch (e) {
                            console.log(`[BrowserHelper] Parse error for ${url}: ${e.message}`);
                            resolve({ url }); // Return URL at least
                        }
                    }
                };

                tempPage.on('response', onResponse);

                // Also safety cleanup on close
                tempPage.once('close', () => {
                    clearTimeout(timeout);
                    resolve(null);
                });
            });

            // Navigate
            try {
                // Configurable wait strategy
                const waitStrategy = options.waitUntil || 'networkidle2';
                await tempPage.goto(triggerUrl, { waitUntil: waitStrategy, timeout: timeoutMs + 5000 });

                // Optional Click
                if (options.clickSelector) {
                    try {
                        console.log(`[BrowserHelper] Waiting to click: ${options.clickSelector}`);
                        await tempPage.waitForSelector(options.clickSelector, { timeout: 10000 });
                        await tempPage.click(options.clickSelector);
                        console.log(`[BrowserHelper] Clicked!`);
                    } catch (clickErr) {
                        console.log(`[BrowserHelper] Standard click failed: ${clickErr.message}. Trying js-click...`);
                        try {
                            await tempPage.evaluate((sel) => {
                                const el = document.querySelector(sel);
                                if (el) el.click();
                            }, options.clickSelector);
                            console.log(`[BrowserHelper] JS-Clicked!`);
                        } catch (jsErr) {
                            console.log(`[BrowserHelper] JS-Click failed: ${jsErr.message}`);
                        }
                    }
                }

            } catch (e) {
                console.log(`[BrowserHelper] Nav error (might be okay if request captured): ${e.message}`);

                // Constructive recovery: Try clicking even if nav timed out
                if (options.clickSelector) {
                    try {
                        console.log(`[BrowserHelper] Recovery clicking: ${options.clickSelector}`);
                        await tempPage.waitForSelector(options.clickSelector, { timeout: 5000 });
                        await tempPage.click(options.clickSelector);
                    } catch (e2) { }
                }
            }

            const result = await capturePromise;

            await tempPage.close().catch(() => { });
            return result;

        } catch (e) {
            console.error(`[BrowserHelper] captureResponse failed: ${e.message}`);
            return null;
        } finally {
            this.resetTimer();
        }
    }

    // Deprecated but kept for compatibility until refactor
    async sniffRequest(url, pattern, timeoutMs = 15000) {
        return this.captureResponse(url, pattern, { timeout: timeoutMs, extractM3u8: true });
    }
}

export default new BrowserTokenHelper();
