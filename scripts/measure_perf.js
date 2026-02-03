
import axios from 'axios';

const API_PORT = process.env.PORT || 4444;
const BASE_URL = `http://localhost:${API_PORT}`;

async function measurePerformance() {
    const episodeId = 'you-cant-be-in-a-rom-com-with-your-childhood-friends-40n7$ep=1$token=MMq49fvy4gfv02lej5OH';
    const encodedId = encodeURIComponent(episodeId);

    // Test Case 1: Fetch ALL (No filters) - Warning: slow
    console.log("--- Test 1: Fetch ALL ---");
    const start1 = Date.now();
    try {
        const url = `${BASE_URL}/api/stream?id=${encodedId}`;
        const res = await axios.get(url, { validateStatus: () => true }); // accept all status
        const duration = (Date.now() - start1) / 1000;
        console.log(`Duration: ${duration}s, Status: ${res.status}, Sources: ${res.data.results?.sources?.length || 0}`);
    } catch (e) { console.error(e.message); }

    // Test Case 2: Filter by Category (e.g. 'sub')
    console.log("\n--- Test 2: Filter by Category (sub) ---");
    const start2 = Date.now();
    try {
        const url = `${BASE_URL}/api/stream?id=${encodedId}&category=sub`;
        const res = await axios.get(url, { validateStatus: () => true });
        const duration = (Date.now() - start2) / 1000;
        console.log(`Duration: ${duration}s, Status: ${res.status}, Sources: ${res.data.results?.sources?.length || 0}`);
        if (duration < 5) console.log("SUCCESS: Significantly faster < 5s");
        else console.log("WARNING: Still kinda slow?");
    } catch (e) { console.error(e.message); }
}

measurePerformance();
