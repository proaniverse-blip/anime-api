import AnikaiProvider from './src/providers/AnikaiProvider.js';

console.log("Instantiating provider...");
const provider = new AnikaiProvider();
console.log("Provider instantiated.");

provider.getRecentEpisodes(1).then(data => {
    console.log("Keys:", Object.keys(data));
    console.log("Latest Episode Present:", !!data.latestEpisode);
}).catch(err => console.error(err));
