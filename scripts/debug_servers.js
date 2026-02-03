
import axios from 'axios';
import * as cheerio from 'cheerio';
import MegaUp from '../src/extractors/MegaUp.js'; // Adjust path if needed

// Mock AnikaiProvider parts
class DebugAnikai {
    constructor() {
        this.baseUrl = 'https://anikai.to';
        this.client = axios.create({
            baseURL: this.baseUrl,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
                'Referer': 'https://anikai.to/',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        this.megaUp = new MegaUp();
    }

    async debugServers(episodeId) {
        try {
            console.log(`Debuging servers for ID: ${episodeId}`);
            let token = '';
            if (episodeId.includes('$token=')) {
                token = episodeId.split('$token=')[1];
            } else {
                console.error("No token in ID");
                return;
            }

            console.log(`Token: ${token}`);
            const verifyToken = await this.megaUp.GenerateToken(token);
            const url = `/ajax/links/list?token=${token}&_=${verifyToken}`;

            console.log(`Fetching: ${this.baseUrl}${url}`);

            const { data } = await this.client.get(url);
            console.log("Response structure:", Object.keys(data));

            if (!data.result) {
                console.error("No 'result' in response data");
                return;
            }

            // Dump HTML to file for inspection
            const fs = await import('fs');
            fs.writeFileSync('debug_servers.html', data.result, 'utf8');
            console.log("Saved HTML to debug_servers.html");

            const $ = cheerio.load(data.result);

            console.log("--- Analyzing Selectors ---");
            const serverItems = $('.server-items');
            console.log(`Found ${serverItems.length} .server-items containers`);

            serverItems.each((i, el) => {
                const id = $(el).attr('data-id');
                const servers = $(el).find('.server');
                console.log(`Container ${i}: data-id="${id}", servers=${servers.length}`);

                servers.each((j, sel) => {
                    const name = $(sel).text().trim();
                    console.log(`  Server: ${name}`);
                });
            });

        } catch (err) {
            console.error("Error:", err.message);
        }
    }
}

const debuggerInstance = new DebugAnikai();
// Use the same ID as before
const episodeId = 'kunon-the-sorcerer-can-see-35y73$ep=1$token=e4Xv-Kfyu0-60g';
debuggerInstance.debugServers(episodeId);
