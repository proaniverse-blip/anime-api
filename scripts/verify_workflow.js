
import axios from 'axios';

// --- Verification Configuration ---
const PORT = process.env.PORT || 4444;
// Localhost Verification URL
const LOCAL_URL = `http://localhost:${PORT}`;
// Production Verification URL (User provided)
const PROD_URL = 'https://anime-api-six-fawn.vercel.app';

// Switch this to test PROD vs LOCAL
const BASE_URL = LOCAL_URL;
// const BASE_URL = PROD_URL; 

async function verifyWorkflow() {
    console.log(`\n=== Verifying Workflow on: ${BASE_URL} ===\n`);

    try {
        // Step 0: Search to get valid ID
        const searchQuery = 'solo leveling';
        console.log(`[Step 0] Searching for: ${searchQuery}`);
        const searchUrl = `${BASE_URL}/api/search?keyword=${encodeURIComponent(searchQuery)}`;
        const searchRes = await axios.get(searchUrl);
        const searchResults = searchRes.data.results?.results || searchRes.data.results || [];

        if (searchResults.length === 0) throw new Error("Search returned no results!");

        const animeId = searchResults[0].id; // Dynamically get ID
        console.log(`   SUCCESS: Found anime. Using ID: ${animeId}`);

        // Step 1: Get Episodes
        console.log(`[Step 1] Fetching Episodes for: ${animeId}`);
        const episodesUrl = `${BASE_URL}/api/episodes/${animeId}?provider=anikai`; // Force anikai to test our provider

        const epRes = await axios.get(episodesUrl);

        // Handle varied response structure (wrapper vs direct)
        const episodes = epRes.data.results?.episodes || epRes.data.episodes || epRes.data;

        if (!episodes) throw new Error("Episodes data is null/undefined");

        console.log(`Debug: Episodes is type ${typeof episodes}, isArray: ${Array.isArray(episodes)}`);

        const fs = await import('fs');
        fs.writeFileSync('debug_episodes.json', JSON.stringify(episodes, null, 2), 'utf8');

        if (!Array.isArray(episodes)) {
            console.log("Episodes dump:", JSON.stringify(episodes, null, 2));
            // Try to find array inside?
            if (episodes.episodes && Array.isArray(episodes.episodes)) {
                episodes = episodes.episodes;
            } else {
                throw new Error("Could not find episodes array in response");
            }
        }

        if (episodes.length === 0) {
            throw new Error("No episodes found!");
        }

        const firstEp = episodes[0];
        console.log(`   SUCCESS: Found ${episodes.length} episodes.`);
        console.log(`   Selected Episode 1 ID: ${firstEp.id}`);


        // Step 2: Get Sources
        // WE MUST URL ENCODE THE ID
        const encodedEpId = encodeURIComponent(firstEp.id);

        // Parameters for optimization (User request: Use filters!)
        const params = `?server=MegaUp&category=sub`;

        const sourcesUrl = `${BASE_URL}/api/anime/${animeId}/episodes/${encodedEpId}/sources${params}`;
        console.log(`\n[Step 2] Fetching Sources for Ep 1 (Sub only)...`);
        console.log(`   URL: ${sourcesUrl}`);

        const sourceRes = await axios.get(sourcesUrl);
        const sourceData = sourceRes.data.results || sourceRes.data; // Wrapper check

        const sources = sourceData.sources || [];

        if (sources.length > 0) {
            console.log(`   SUCCESS: Found ${sources.length} sources.`);
            console.log(`   First Source: [${sources[0].type}] ${sources[0].server} -> ${sources[0].url.substring(0, 30)}...`);
        } else {
            console.log("   WARNING: No sources returned.");
        }

    } catch (err) {
        console.error("\n!!! WORKFLOW FAILED !!!");
        console.error(err.message);

        const fs = await import('fs');
        const errorLog = {
            message: err.message,
            status: err.response ? err.response.status : 'No Response',
            data: err.response ? err.response.data : null,
            stack: err.stack
        };
        fs.writeFileSync('workflow_error.json', JSON.stringify(errorLog, null, 2), 'utf8');

        if (err.response) {
            console.error(`Status: ${err.response.status}`);
        }
    }
}

verifyWorkflow();
