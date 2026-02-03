
import axios from 'axios';

const API_PORT = process.env.PORT || 4444;
const BASE_URL = `http://localhost:${API_PORT}`;

async function verifyDub() {
    try {
        // Skip search, try hardcoded ID
        const anime = { id: 'naruto', title: 'Naruto' };
        console.log(`Using hardcoded: ${anime.title} (${anime.id})`);

        console.log("Fetching Episodes...");
        const epRes = await axios.get(`${BASE_URL}/api/episodes/${anime.id}?provider=anikai`);
        const episodes = epRes.data.results.episodes; // api/episodes/:id returns { results: { episodes: [] } } or just episodes?
        // Check apiRoutes.js: episodeListController.getEpisodes -> controller calls provider.getEpisodes -> returns array usually?
        // Let's inspect response.

        // Wait, controller response wrapper wraps in { success: true, results: data }
        // So it's response.data.results.

        const firstEp = Array.isArray(epRes.data.results) ? epRes.data.results[0] : epRes.data.results.episodes?.[0];

        if (!firstEp) {
            console.log("No episodes found", epRes.data.results);
            return;
        }

        console.log(`Testing Episode 1: ${firstEp.id}`);

        const encodedId = encodeURIComponent(firstEp.id);
        const sourceUrl = `${BASE_URL}/api/anime/${anime.id}/episodes/${encodedId}/sources?provider=anikai`;
        console.log(`Fetching Sources: ${sourceUrl}`);

        const sourceRes = await axios.get(sourceUrl);
        const sources = sourceRes.data.results.sources;

        const subCount = sources.filter(s => s.type === 'sub').length;
        const dubCount = sources.filter(s => s.type === 'dub').length;
        const softSubCount = sources.filter(s => s.type === 'softsub').length;

        console.log(`Sources found: Sub=${subCount}, Dub=${dubCount}, SoftSub=${softSubCount}`);

        if (dubCount > 0) {
            console.log("SUCCESS: Dub servers detected!");
        } else {
            console.log("FAILURE: No dub servers found (and Solo Leveling should have them).");
        }

    } catch (err) {
        console.error("Error:", err.message);
        if (err.response) console.error(err.response.data);
    }
}

verifyDub();
