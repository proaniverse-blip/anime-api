
import axios from 'axios';

const API_PORT = process.env.PORT || 4444;
const BASE_URL = `http://localhost:${API_PORT}`;

async function testStreamInfoDefaultProvider() {
    // ID from user report: you-cant-be-in-a-rom-com-with-your-childhood-friends-40n7$ep=1$token=MMq49fvy4gfv02lej5OH
    const episodeId = 'you-cant-be-in-a-rom-com-with-your-childhood-friends-40n7$ep=1$token=MMq49fvy4gfv02lej5OH';
    const encodedId = encodeURIComponent(episodeId);

    // Testing /api/stream endpoint WITHOUT provider param (defaults to hianime)
    const url = `${BASE_URL}/api/stream?id=${encodedId}`;

    console.log(`Testing URL (No Provider): ${url}`);

    try {
        const response = await axios.get(url);

        console.log('Status Code:', response.status);

        if (response.data.results && response.data.results.sources && response.data.results.sources.length > 0) {
            console.log(`SUCCESS: Found ${response.data.results.sources.length} sources!`);
        } else {
            console.log('FAILURE: Sources array is empty.');
        }

        const fs = await import('fs');
        fs.writeFileSync('missing_provider_result.json', JSON.stringify(response.data, null, 2), 'utf8');

    } catch (error) {
        console.error('Error fetching stream info:', error.message);
        const fs = await import('fs');
        const errorLog = {
            message: error.message,
            code: error.code,
            response: error.response ? error.response.data : 'No response received'
        };
        fs.writeFileSync('missing_provider_result.json', JSON.stringify(errorLog, null, 2), 'utf8');
    }
}

testStreamInfoDefaultProvider();
