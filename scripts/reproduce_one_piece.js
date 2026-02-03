
import axios from 'axios';

const PORT = process.env.PORT || 4444;
const BASE_URL = `http://localhost:${PORT}`;

async function verifyOnePiece() {
    console.log(`\n=== Verifying One Piece on: ${BASE_URL} ===\n`);

    const animeId = 'one-piece-dk6r';
    // User provided ID: one-piece-dk6r$ep=1$token=coDh9_Ly6U6v1W8Visvd
    // But we should URL Encode it.
    const rawEpId = 'one-piece-dk6r$ep=1$token=coDh9_Ly6U6v1W8Visvd';
    const encodedEpId = encodeURIComponent(rawEpId);

    // Test 1: Fetch Sources (No filters -> Should be ALL)
    console.log(`[Test] Fetching ALL sources for One Piece Ep 1...`);
    const url = `${BASE_URL}/api/anime/${animeId}/episodes/${encodedEpId}/sources`;
    console.log(`   URL: ${url}`);

    try {
        const start = Date.now();
        const res = await axios.get(url);
        const duration = (Date.now() - start) / 1000;

        const data = res.data.results || res.data;
        const sources = data.sources || [];

        console.log(`   Status: ${res.status}`);
        console.log(`   Duration: ${duration}s`);
        console.log(`   Sources Found: ${sources.length}`);

        if (sources.length > 0) {
            console.log("   First Source:", sources[0]);
        } else {
            console.log("   FAILURE: Returned empty array.");
        }

    } catch (err) {
        console.error("   ERROR:", err.message);
        if (err.response) {
            console.error("   Response Data:", JSON.stringify(err.response.data, null, 2));
        }
    }
}

verifyOnePiece();
