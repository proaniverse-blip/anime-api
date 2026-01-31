<div align="center">

![Static Badge](https://img.shields.io/badge/node.js-grey?logo=nodedotjs) 
[![GitHub stars](https://img.shields.io/github/stars/proaniverse-blip/anime-api?style=social)](https://github.com/proaniverse-blip/anime-api)
[![License](https://img.shields.io/github/license/proaniverse-blip/anime-api)](https://github.com/proaniverse-blip/anime-api/blob/main/LICENSE)
![Static Badge](https://img.shields.io/badge/version-2.0.0-blue)
![Static Badge](https://img.shields.io/badge/provider-Anikai-red)

</div>

## <span>Disclaimer</span>

1.  This `api` does not store any files, it only links to media hosted on 3rd party services.
2.  This `api` is explicitly made for educational purposes only and not for commercial usage.

<p align="center">
  <img src="./public/anya.gif" width="200" height="200" />
</p>

# <p align="center">Anikai API</p>

<p align="center">
A high-performance, resilient REST API for Anime, powered exclusively by <b>Anikai</b>.
<br/>
Features <b>Auto-Domain Rotation</b>, <b>Multi-Server Resolution</b>, and <b>Connection Pooling</b>.
</p>

> <h2> Table of Contents </h2>

- [Installation](#installation)
- [Deployment](#deployment)
- [Features](#features)
- [Documentation](#documentation)
  - [GET Home Info](#get-home-info)
  - [GET Search Result](#get-search-result)
  - [GET Anime Info](#get-anime-info)
  - [GET Streaming Links](#get-streaming-links)
  - [GET Category](#get-category-info)
  - [GET Recent Episodes](#get-recent-episodes)
  - [GET Top Ten](#get-top-ten)
    - Returns top anime for Day, Week, and Month.
  - [GET Schedule](#get-schedule)
    - Returns anime schedule (Empty for now).
- [Advanced](#advanced)

# Installation

## Local installation

1. Clone and install:
```bash
# Clone the repository
git clone https://github.com/proaniverse-blip/anime-api.git

# Navigate to the project directoryall
```

2. Setup `.env`:
```bash
ALLOWED_ORIGIN=*
PORT=4444
```

3. Start the server:
```bash
$ npm start
```

# Features

- **Anikai-Only Architecture**: Optimized specifically for Anikai/AnimeKai.
- **Auto-Domain Rotation**: Automatically switches domains (`anikai.to` -> `animekai.im` -> etc.) if one fails or is blocked.
- **Multi-Link Resolution**: Fetches valid `.m3u8` links for **ALL** available servers (Sub, Dub, Softsub) in parallel.
- **High Performance**: Uses Connection Pooling and Token Caching to minimize latency.

# Documentation

### `GET` Home Info

Returns Spotlights, Trending, and Latest Episodes.

```bash
GET /api/
```

**Response:**
```json
{
  "spotlights": [{ "id": "...", "title": "...", "poster": "..." }],
  "trending": [{ "id": "...", "title": "...", "poster": "..." }],
  "latestEpisode": [{ "id": "...", "title": "...", "episodes": { "sub": 1, "dub": 1 } }]
}
```

---

### `GET` Search Result

Search for anime by keyword.

```bash
GET /api/search?keyword={query}&page={number}
```

**Response:**
```json
{
  "currentPage": 1,
  "hasNextPage": true,
  "results": [
    {
      "id": "naruto-1234",
      "title": "Naruto",
      "poster": "https://...",
      "type": "TV"
    }
  ]
}
```

---

### `GET` Anime Info

Get full details and episode list.

```bash
GET /api/info?id={anime_id}
```

**Response:**
```json
{
  "id": "naruto-1234",
  "title": "Naruto",
  "description": "...",
  "episodes": [
    {
      "id": "naruto-episode-1", // Use this ID for streaming
      "number": 1,
      "title": "Enter Naruto"
    }
  ]
}
```

---

### `GET` Streaming Links

Get streaming links for an episode. Resolves **ALL** servers.

```bash
GET /api/stream?id={episode_id}
```

**Response:**
```json
{
  "sources": [
    {
      "url": "https://.../master.m3u8",
      "type": "sub",
      "server": "MegaUp Server 1",
      "isM3U8": true
    },
    {
      "url": "https://.../dub.m3u8",
      "type": "dub",
      "server": "MegaUp Server 1",
      "isM3U8": true
    }
  ],
  "subtitles": [{ "url": "...", "lang": "English" }],
  "intro": { "start": 90, "end": 210 },
  "outro": { "start": 1300, "end": 1420 },
  "download": "https://..."
}
```

---

### `GET` Category Info

Get anime by category or genre.

```bash
GET /api/{category}?page={number}
```

**Categories**: `movie`, `tv`, `subbed-anime`, `dubbed-anime`, `recently-added`, `top-upcoming`, `genre/action`, `genre/romance`, etc.

---

### `GET` Top Ten (Placeholder)

*Currently returns empty list pending implementation.*

```bash
GET /api/top-ten
```

---

### `GET` Schedule (Placeholder)

*Currently returns empty list pending implementation.*

```bash
GET /api/schedule
```

# Advanced

### Domain Rotation
The API includes a built-in list of domains (`anikai.to`, `animekai.im`, `animekai.la`, `animekai.nl`, `animekai.vc`). If a request fails with a network error or 5xx code, it will automatically cycle to the next domain and retry.

### Caching
Token generation for `MegaUp` servers is cached in-memory to improve speed for repeated requests.
