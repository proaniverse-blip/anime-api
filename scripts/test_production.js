import axios from 'axios';

const PROD_URL = 'https://anime-api-six-fawn.vercel.app';

async function testProduction() {
    const animeId = 'one-piece-dk6r';
    const rawEpisodeId = 'one-piece-dk6r$ep=1$token=coDh9_Ly6U6v1W8Visvd';
    const encodedEpisodeId = encodeURIComponent(rawEpisodeId);

    const testUrl = `${PROD_URL}/api/anime/${animeId}/episodes/${encodedEpisodeId}/sources?category=sub`;

    console.log('Testing Production URL:');
    console.log(testUrl);
    console.log('\nFetching...\n');

    try {
        const response = await axios.get(testUrl, { timeout: 30000 });

        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(response.data, null, 2));

        const data = response.data.results || response.data;
        const sources = data.sources || [];

        console.log('\nSources count:', sources.length);

        if (sources.length === 0) {
            console.log('\n❌ PRODUCTION ERROR: Empty sources array');
            console.log('This means either:');
            console.log('1. Vercel is still deploying the new code');
            console.log('2. Build cache needs to be cleared');
            console.log('3. Function is timing out');
        } else {
            console.log('\n✅ Production working!');
        }

    } catch (error) {
        console.log('❌ Request failed:', error.message);
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testProduction();
