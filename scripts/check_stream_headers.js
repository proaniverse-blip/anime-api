
import axios from 'axios';

const PORT = 4444;
const BASE_URL = `http://localhost:${PORT}`;

// The known working endpoint for local test
const animeId = 'one-piece-dk6r';
const encodedEpId = encodeURIComponent('one-piece-dk6r$ep=1$token=coDh9_Ly6U6v1W8Visvd');
const sourcesEndpoint = `${BASE_URL}/api/anime/${animeId}/episodes/${encodedEpId}/sources`;

async function checkHeaders() {
    console.log('--- Step 1: Getting a fresh Stream URL ---');
    let streamUrl = '';

    try {
        const res = await axios.get(sourcesEndpoint);
        const data = res.data.results || res.data;
        const sources = data.sources || [];

        if (sources.length === 0) {
            console.error('No sources found! Cannot test headers.');
            process.exit(1);
        }

        streamUrl = sources[0].url;
        console.log('Target Stream URL:', streamUrl);

    } catch (err) {
        console.error('Failed to fetch sources:', err.code || err.message);
        if (err.response) {
            console.error('Status:', err.response.status);
            console.error('Data:', JSON.stringify(err.response.data));
        }
        process.exit(1);
    }

    console.log('\n--- Step 2: Testing Headers ---');

    // Parse domain for referer
    const urlObj = new URL(streamUrl);
    const domain = `${urlObj.protocol}//${urlObj.host}`;

    const tests = [
        { name: 'No Headers', headers: {} },
        { name: 'Referer: Domain', headers: { 'Referer': domain + '/' } },
        { name: 'Referer: Anikai', headers: { 'Referer': 'https://anikai.to/' } },
        { name: 'Origin: Domain', headers: { 'Origin': domain } },
        { name: 'Origin: MegaUp', headers: { 'Origin': 'https://megaup.cc' } },
        { name: 'Origin: Google', headers: { 'Origin': 'https://google.com' } }
    ];

    for (const test of tests) {
        try {
            // Use a short timeout
            const res = await axios.get(streamUrl, {
                headers: test.headers,
                timeout: 5000,
                validateStatus: status => true // Do not throw on error status
            });

            console.log(`[${test.name}] Status: ${res.status} ${res.statusText}`);
            if (res.status === 200) {
                console.log('   -> ACCESSIBLE ✅');
                console.log(`      CORS: ${res.headers['access-control-allow-origin'] || 'None'}`);
            } else {
                console.log('   -> BLOCKED ❌');
            }
        } catch (err) {
            console.log(`[${test.name}] Error: ${err.message}`);
        }
    }
}

checkHeaders();
