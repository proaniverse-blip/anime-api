import AnikaiProvider from '../src/providers/AnikaiProvider.js';

const provider = new AnikaiProvider();

async function run() {
    console.log("Fetching Anime Info HTML...");
    const id = 'dark-moon-the-blood-altar-9mgg';
    try {
        const { data } = await provider.client.get(`/watch/${id}`);
        const cheerio = await import('cheerio');
        const $ = cheerio.load(data);

        const fs = await import('fs');
        fs.writeFileSync('debug_full_page.html', data);
        console.log("Written full HTML to debug_full_page.html");

        console.log("--- INFO CONTAINER HTML ---");
        // Dump the .info container to see class names/structure
        console.log("--- SEARCHING FOR META ---");
        const body = $('body').html();
        if (body.includes('Japanese:')) {
            console.log("FOUND 'Japanese:' string!");
            // Find parent class
            const parent = $('div:contains("Japanese:")').last().parent().attr('class');
            console.log(`Parent Class of 'Japanese:': ${parent}`);
            console.log($('div:contains("Japanese:")').last().parent().html());
        } else {
            console.log("NOT FOUND 'Japanese:' string in body.");
        }

        console.log("--- SEARCHING FOR DESCRIPTION ---");
        // Look for the synopsis text start if identifiable, or just dump known containers
        console.log($('.film-description').length, $('.film-description').html());
        console.log($('.description').length, $('.description').html());
        console.log($('#info .description').length);

        // Dump all div classes to guess structure
        // console.log($('*').map((i, el) => $(el).attr('class')).get().join(', '));
    } catch (err) {
        console.error("Error:", err.message);
    }
}

run();
