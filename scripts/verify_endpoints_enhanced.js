import AnikaiProvider from '../src/providers/AnikaiProvider.js';

const provider = new AnikaiProvider();

async function runTests() {
    console.log("=== STARTING ENHANCED ENDPOINT VERIFICATION ===\n");

    try {
        // 1. HOME (/api/)
        console.log("1. Testing HOME Info...");
        const home = await provider.getHomeInfo();
        console.log(`   - Spotlights: ${home.spotlights.length}`);
        console.log(`   - Trending: ${home.trending.length}`);
        console.log(`   - Latest Ep: ${home.latestEpisode.length}`);
        if (home.latestEpisode.length === 0) console.warn("   WARN: No Latest Episodes found. Check selector.");
        else console.log(`   - Latest Ep Sample: ${home.latestEpisode[0].title}`);

        // 2. SEARCH (/api/search)
        console.log("\n2. Testing SEARCH ('dark moon')...");
        const search = await provider.search("dark moon");
        if (search.results.length === 0) {
            console.error("   FAIL: No search results.");
            return;
        }
        const anime = search.results[0];
        console.log(`   - First Result: ${anime.title} (${anime.id})`);

        // 3. INFO (/api/info)
        console.log(`\n3. Testing INFO (${anime.id})...`);
        const info = await provider.getAnimeInfo(anime.id);
        console.log(`   - Title: ${info.title} (${info.japanTitle})`);
        console.log(`   - Status: ${info.status}`);
        console.log(`   - Duration: ${info.duration}`);
        console.log(`   - Studios: ${info.studios.join(', ')}`);
        console.log(`   - Description: ${info.description ? info.description.substring(0, 30) + '...' : 'NONE'}`);
        if (!info.status || !info.description) console.warn("   WARN: Missing some metadata.");

        // 4. TOP TEN (/api/top-ten) [NOW IMPLEMENTED]
        console.log("\n4. Testing TOP TEN (Real Scraping)...");
        const top = await provider.getTopTen();
        console.log(`   - Results: ${top.length}`);
        if (top.length > 0) {
            const day = top.filter(x => x.period === 'day');
            console.log(`   - Day list: ${day.length} items. Rank 1: ${day[0]?.title}`);
        } else {
            console.warn("   WARN: Top Ten list empty. Selectors might be incorrect or site changed.");
        }

        console.log("\n=== ENHANCED VERIFICATION COMPLETE ===");

    } catch (err) {
        console.error("\nCRITICAL ERROR:", err);
    }
}

runTests();
