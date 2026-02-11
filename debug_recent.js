import AnikaiProvider from './src/providers/AnikaiProvider.js';

async function testRecent() {
    const provider = new AnikaiProvider();
    console.log("Fetching Recent Episodes (Page 1)...");
    try {
        const data = await provider.getRecentEpisodes(1);
        console.log("Result keys:", Object.keys(data));
        console.log("First item:", JSON.stringify(data.results[0], null, 2));
        console.log("Number of results:", data.results.length);
        console.log("Has Next Page:", data.hasNextPage);
    } catch (e) {
        console.error("Error:", e);
    }
}

testRecent();
