const fs = require('fs');
const path = require('path');

// Patch @discordjs/voice to await DAVE library loading before identifying
// Without this, the bot sends max_dave_protocol_version: 0 and Discord rejects the connection
const voicePath = path.join(__dirname, '..', 'node_modules', '@discordjs', 'voice', 'dist', 'index.js');
if (fs.existsSync(voicePath)) {
  let code = fs.readFileSync(voicePath, 'utf8');
  if (!code.includes('await daveLoadPromise')) {
    code = code.replace(
      'onWsOpen() {',
      'async onWsOpen() {\n    await daveLoadPromise;'
    );
    fs.writeFileSync(voicePath, code);
    console.log('[postinstall] Patched @discordjs/voice: await daveLoadPromise in onWsOpen');
  }
}

// Patch @distube/yt-dlp to fix deprecated flags, add search support, and handle playlists
const ytdlpPath = path.join(__dirname, '..', 'node_modules', '@distube', 'yt-dlp', 'dist', 'index.js');
if (fs.existsSync(ytdlpPath)) {
  let code = fs.readFileSync(ytdlpPath, 'utf8');
  let patched = false;

  // Remove deprecated --no-call-home flag
  if (code.includes('noCallHome: true,')) {
    code = code.replace(/\s*noCallHome: true,/g, '');
    patched = true;
  }

  // Replace the resolve method's flags to support search, playlists, and block YouTube Mixes
  if (!code.includes('defaultSearch')) {
    code = code.replace(
      /async resolve\(url, options\) \{\s*\n\s*const info = await json\(url, \{[^}]+\}\)/,
      `async resolve(url, options) {
    const isYtMix = /[?&]list=RD/.test(url) || /[?&]start_radio=1/.test(url);
    const flags = {
      dumpSingleJson: true,
      noWarnings: true,
      defaultSearch: "ytsearch",
      preferFreeFormats: true,
      skipDownload: true,
      simulate: true,
      flatPlaylist: true
    };
    if (isYtMix) flags.noPlaylist = true;
    const info = await json(url, flags)`
    );
    patched = true;
  }

  if (patched) {
    fs.writeFileSync(ytdlpPath, code);
    console.log('[postinstall] Patched @distube/yt-dlp: removed noCallHome, added search/playlist support');
  }
}

// Patch @distube/spotify to fall back to scraping when API fails for playlists/albums
// Spotify's Feb 2026 API changes broke client credentials access to playlist tracks
const spotifyPath = path.join(__dirname, '..', 'node_modules', '@distube', 'spotify', 'dist', 'index.js');
if (fs.existsSync(spotifyPath)) {
  let code = fs.readFileSync(spotifyPath, 'utf8');
  if (!code.includes('SPOTIFY_API_FALLBACK')) {
    // Replace the playlist/album branch in getData to catch API errors and fall back to scraping
    code = code.replace(
      `    try {
      const { body } = await WEB_API[type === "album" ? "getAlbum" : type === "playlist" ? "getPlaylist" : "getArtist"](id);
      return {
        type,
        name: body.name,
        thumbnail: body.images?.[0]?.url,
        url: body.external_urls?.spotify,
        tracks: (await this.#getTracks(body)).filter((t) => t?.type === "track").map((t) => new APITrack(t))
      };
    } catch (e) {
      throw apiError(e);
    }`,
      `    try {
      const { body } = await WEB_API[type === "album" ? "getAlbum" : type === "playlist" ? "getPlaylist" : "getArtist"](id);
      return {
        type,
        name: body.name,
        thumbnail: body.images?.[0]?.url,
        url: body.external_urls?.spotify,
        tracks: (await this.#getTracks(body)).filter((t) => t?.type === "track").map((t) => new APITrack(t))
      };
    } catch (e) {
      // SPOTIFY_API_FALLBACK: Fall back to scraping when API fails (Feb 2026 Spotify changes)
      if (type === "playlist" || type === "album") {
        try {
          const data = await INFO.getData(url);
          const thumbnail = data.coverArt?.sources?.[0]?.url;
          return {
            type,
            name: data.title,
            thumbnail,
            url,
            tracks: data.trackList.map((i) => ({
              type: "track",
              id: this.parseUrl(i.uri).id,
              name: i.title,
              artists: [{ name: i.subtitle }],
              duration: i.duration,
              thumbnail
            }))
          };
        } catch (e2) {
          throw apiError(e);
        }
      }
      throw apiError(e);
    }`
    );
    fs.writeFileSync(spotifyPath, code);
    console.log('[postinstall] Patched @distube/spotify: added scraping fallback for playlists/albums');
  }
}
