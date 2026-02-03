import axios from 'axios';
import fs from 'fs';

const PORT = process.env.PORT || 4444;
const BASE_URL = `http://localhost:${PORT}`;

async function testSourcesEndpoint() {
    console.log('\n========================================');
    console.log('DETAILED SOURCES ENDPOINT TEST');
    console.log('========================================\n');

    // One Piece test case from user
    const animeId = 'one-piece-dk6r';
    const rawEpisodeId = 'one-piece-dk6r$ep=1$token=coDh9_Ly6U6v1W8Visvd';
    const encodedEpisodeId = encodeURIComponent(rawEpisodeId);

    // Test WITHOUT any query params (should return ALL)
    const testUrl = `${BASE_URL}/api/anime/${animeId}/episodes/${encodedEpisodeId}/sources`;

    console.log('Test URL:', testUrl);
    console.log('Raw Episode ID:', rawEpisodeId);
    console.log('Encoded Episode ID:', encodedEpisodeId);
    console.log('\nFetching...\n');

    try {
        const startTime = Date.now();
        const response = await axios.get(testUrl, {
            timeout: 30000 // 30 second timeout for local testing
        });
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log('✅ REQUEST SUCCESSFUL');
        console.log('Duration:', duration + 's');
        console.log('Status:', response.status);
        console.log('\n------- RAW RESPONSE -------');
        console.log(JSON.stringify(response.data, null, 2));
        console.log('----------------------------\n');

        // Extract the actual data
        const data = response.data.results || response.data;
        const sources = data.sources || [];
        const subtitles = data.subtitles || [];

        console.log('📊 RESPONSE ANALYSIS:');
        console.log('  Total Sources:', sources.length);
        console.log('  Total Subtitles:', subtitles.length);

        if (sources.length > 0) {
            console.log('\n  ✅ SOURCES FOUND:');
            sources.forEach((source, index) => {
                console.log(`    [${index + 1}] Type: ${source.type} | Server: ${source.server}`);
                console.log(`        URL: ${source.url.substring(0, 60)}...`);
                console.log(`        isM3U8: ${source.isM3U8}`);
            });
        } else {
            console.log('\n  ❌ ERROR: SOURCES ARRAY IS EMPTY!');
        }

        if (data.intro) {
            console.log('\n  Intro Skip:', JSON.stringify(data.intro));
        }
        if (data.outro) {
            console.log('  Outro Skip:', JSON.stringify(data.outro));
        }

        // Write full response to file
        fs.writeFileSync('test_sources_output.json', JSON.stringify(response.data, null, 2), 'utf8');
        console.log('\n📝 Full response written to: test_sources_output.json');

        // Final verdict
        if (sources.length === 0) {
            console.log('\n❌ FAILED: Endpoint returned empty sources array');
            process.exit(1);
        } else {
            console.log('\n✅ SUCCESS: Endpoint working correctly');
        }

    } catch (error) {
        console.log('❌ REQUEST FAILED');
        console.log('Error:', error.message);

        if (error.response) {
            console.log('\nResponse Status:', error.response.status);
            console.log('Response Data:', JSON.stringify(error.response.data, null, 2));
        }

        if (error.code === 'ECONNREFUSED') {
            console.log('\n⚠️  Server is not running! Start it with: npm run dev');
        }

        process.exit(1);
    }
}

testSourcesEndpoint();
