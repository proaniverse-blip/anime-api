import AnikaiProvider from './src/providers/AnikaiProvider.js';
import fs from 'fs';

async function testRecent() {
    const provider = new AnikaiProvider();
    console.log("Fetching Recent Episodes (Page 1)...");
    try {
        const data = await provider.getRecentEpisodes(1);
        fs.writeFileSync('debug_output.json', JSON.stringify(data, null, 2));
        console.log("Written to debug_output.json");
    } catch (e) {
        console.error("Error:", e);
    }
}

testRecent();
