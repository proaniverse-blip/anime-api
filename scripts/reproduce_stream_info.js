
import axios from 'axios';
import fs from 'fs';

const API_PORT = process.env.PORT || 4444;
const BASE_URL = `http://localhost:${API_PORT}`;

async function testStreamInfo() {
    // ID from user report: you-cant-be-in-a-rom-com-with-your-childhood-friends-40n7$ep=1$token=MMq49fvy4gfv02lej5OH
    const episodeId = 'you-cant-be-in-a-rom-com-with-your-childhood-friends-40n7$ep=1$token=MMq49fvy4gfv02lej5OH';
    const encodedId = encodeURIComponent(episodeId);

    // Testing /api/stream endpoint
    const url = `${BASE_URL}/api/stream?id=${encodedId}&provider=anikai`;

    console.log(`Testing URL: ${url}`);

    try {
        const response = await axios.get(url);

        console.log('Status Code:', response.status);

        if (response.data.results && response.data.results.sources && response.data.results.sources.length > 0) {
            console.log(`SUCCESS: Found ${response.data.results.sources.length} sources!`);
        } else {
            console.log('FAILURE: Sources array is empty.');
        }

        fs.writeFileSync('stream_info_result.json', JSON.stringify(response.data, null, 2), 'utf8');

    } catch (error) {
        console.error('Error fetching stream info:', error.message);
        if (error.response) {
            console.log('Error Data:', error.response.data);
            fs.writeFileSync('stream_info_result.json', JSON.stringify(error.response.data, null, 2), 'utf8');
        }
    }
}

testStreamInfo();
