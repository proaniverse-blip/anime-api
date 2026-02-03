import fs from 'fs';
import axios from 'axios';

const API_PORT = process.env.PORT || 4444;
const BASE_URL = `http://localhost:${API_PORT}`;

async function testSources() {
    const animeId = 'kunon-the-sorcerer-can-see-35y73';
    // This is the encoded ID from the logs: kunon-the-sorcerer-can-see-35y73%24ep%3D1%24token%3De4Xv-Kfyu0-60g
    // Decoded: kunon-the-sorcerer-can-see-35y73$ep=1$token=e4Xv-Kfyu0-60g
    const episodeId = 'kunon-the-sorcerer-can-see-35y73$ep=1$token=e4Xv-Kfyu0-60g';

    // Encode it for the URL path as axios might not do it exactly as the browser did, but let's try strict matching
    const encodedEpisodeId = encodeURIComponent(episodeId);

    // The logs showed query params: {server: 'hd-1', category: 'sub'}
    const url = `${BASE_URL}/api/anime/${animeId}/episodes/${encodedEpisodeId}/sources?server=hd-1&category=sub`;

    console.log(`Testing URL: ${url}`);

    try {
        const response = await axios.get(url);

        const result = {
            status: response.status,
            sourcesCount: response.data.results?.sources?.length || 0,
            firstSource: response.data.results?.sources?.[0],
            fullData: response.data
        };

        fs.writeFileSync('result.json', JSON.stringify(result, null, 2), 'utf8');
        console.log('Result written to result.json');

        if (result.sourcesCount > 0) {
            console.log('SUCCESS: Sources found!');
        } else {
            console.log('FAILURE: Sources array is empty.');
        }

    } catch (error) {
        console.error('Error fetching sources:', error.message);
        fs.writeFileSync('result.json', JSON.stringify({ error: error.message, response: error.response?.data }, null, 2), 'utf8');
    }
}

testSources();
