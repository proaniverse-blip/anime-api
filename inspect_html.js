import axios from 'axios';
import fs from 'fs';

async function fetchHtml() {
    try {
        const response = await axios.get('https://anikai.to/recent');
        fs.writeFileSync('recent_page.html', response.data);
        console.log("Saved recent_page.html");
    } catch (e) {
        console.error("Error fetching HTML:", e);
    }
}

fetchHtml();
