import axios from 'axios';

const PROD_URL = 'https://anime-api-six-fawn.vercel.app';

async function testProductionNow() {
    console.log('\n=== TESTING PRODUCTION RIGHT NOW ===\n');

    const animeId = 'one-piece-dk6r';
    const rawEpisodeId = 'one-piece-dk6r$ep=1$token=coDh9_Ly6U6v1W8Visvd';
    const encodedEpisodeId = encodeURIComponent(rawEpisodeId);

    // Test with category filter
    const testUrl = `${PROD_URL}/api/anime/${animeId}/episodes/${encodedEpisodeId}/sources?category=sub`;

    console.log('URL:', testUrl);
    console.log('\nFetching from production...\n');

    try {
        const startTime = Date.now();
        const response = await axios.get(testUrl, {
            timeout: 30000,
            validateStatus: () => true // Accept any status code
        });
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log('Status:', response.status);
        console.log('Duration:', duration + 's');
        console.log('\nFull Response:');
        console.log(JSON.stringify(response.data, null, 2));

        const data = response.data.results || response.data;
        const sources = data.sources || [];

        console.log('\n========================================');
        console.log('SOURCES COUNT:', sources.length);
        console.log('========================================');

        if (sources.length === 0) {
            console.log('\n❌ PRODUCTION RETURNING EMPTY SOURCES');
            console.log('\nPossible causes:');
            console.log('1. Vercel function timeout (>10s limit)');
            console.log('2. Deployment not complete yet');
            console.log('3. Provider error on serverless environment');
        } else {
            console.log('\n✅ PRODUCTION WORKING!');
            sources.forEach((s, i) => {
                console.log(`  [${i + 1}] ${s.type} - ${s.server}`);
            });
        }

    } catch (error) {
        console.log('\n❌ REQUEST FAILED');
        console.log('Error:', error.message);
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testProductionNow();
