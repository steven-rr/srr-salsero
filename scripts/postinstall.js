const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Download a standalone yt-dlp binary if the current one won't work on this platform
const binDir = path.join(__dirname, '..', 'bin');
const ytdlpBin = path.join(binDir, 'yt-dlp');
const needsDownload = (() => {
  if (!fs.existsSync(ytdlpBin)) return true;
  // If it's a shell script referencing Homebrew, it won't work on Linux
  const content = fs.readFileSync(ytdlpBin, 'utf8');
  if (content.startsWith('#!/bin/bash') || content.includes('homebrew')) return true;
  return false;
})();

if (needsDownload) {
  const platform = process.platform;
  const arch = process.arch;
  let asset;
  if (platform === 'linux' && arch === 'x64') asset = 'yt-dlp_linux';
  else if (platform === 'linux' && arch === 'arm64') asset = 'yt-dlp_linux_aarch64';
  else if (platform === 'darwin' && arch === 'arm64') asset = 'yt-dlp_macos';
  else if (platform === 'darwin' && arch === 'x64') asset = 'yt-dlp_macos';

  if (asset) {
    const url = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${asset}`;
    console.log(`[postinstall] Downloading yt-dlp for ${platform}/${arch}...`);
    if (!fs.existsSync(binDir)) fs.mkdirSync(binDir, { recursive: true });
    try {
      execSync(`curl -L --fail -o "${ytdlpBin}" "${url}"`, { stdio: 'inherit', timeout: 60000 });
      fs.chmodSync(ytdlpBin, 0o755);
      console.log('[postinstall] yt-dlp downloaded successfully');
      // Verify it's a real binary, not an error page
      const header = fs.readFileSync(ytdlpBin, 'utf8').slice(0, 20);
      if (header.startsWith('<!') || header.startsWith('<html')) {
        fs.unlinkSync(ytdlpBin);
        console.warn('[postinstall] Downloaded file was HTML, not a binary — removed');
      }
    } catch (e) {
      console.warn('[postinstall] Failed to download yt-dlp:', e.message);
    }
  }
}

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

  // Replace the resolve method's flags to support search, playlists, and mixes
  if (!code.includes('defaultSearch')) {
    code = code.replace(
      /async resolve\(url, options\) \{\s*\n\s*const info = await json\(url, \{[^}]+\}\)/,
      `async resolve(url, options) {
    const flags = {
      dumpSingleJson: true,
      noWarnings: true,
      defaultSearch: "ytsearch",
      preferFreeFormats: true,
      skipDownload: true,
      simulate: true,
      flatPlaylist: true
    };
    const info = await json(url, flags)`
    );
    patched = true;
  }

  // Fix playlist/mix entries missing extractor field (flatPlaylist returns minimal data)
  if (code.includes('info.entries.map((i) => new YtDlpSong')) {
    code = code.replace(
      /if \(isPlaylist\(info\)\) \{\s*if \(info\.entries\.length === 0\)[^}]+\}\s*return new import_distube\.Playlist\(\s*\{[^}]+songs: info\.entries\.map\(\(i\) => new YtDlpSong\(this, i, options\)\)[^)]+\)[^)]*\)[^;]*;/s,
      `if (isPlaylist(info)) {
      const validEntries = info.entries.filter((i) => i && (i.id || i.url || i.webpage_url));
      if (validEntries.length === 0) throw new import_distube.DisTubeError("YTDLP_ERROR", "The playlist is empty");
      const fallbackExtractor = info.extractor || "youtube";
      return new import_distube.Playlist(
        {
          source: fallbackExtractor,
          songs: validEntries.map((i) => {
            if (!i.extractor) i.extractor = i.ie_key || fallbackExtractor;
            if (!i.webpage_url && !i.original_url && i.url) i.webpage_url = i.url;
            return new YtDlpSong(this, i, options);
          }),
          id: (info.id || "mix").toString(),
          name: info.title || "Mix",
          url: info.webpage_url,
          thumbnail: info.thumbnails?.[0]?.url
        },
        options
      );`
    );
    patched = true;
  }

  if (patched) {
    fs.writeFileSync(ytdlpPath, code);
    console.log('[postinstall] Patched @distube/yt-dlp: removed noCallHome, added search/playlist/mix support');
  }
}

// Patch @distube/spotify to use Spotify's internal spclient API for playlist tracks
// Spotify's Feb 2026 API changes broke client credentials access to playlist tracks
// The spclient API is not rate limited and returns all tracks with metadata
const spotifyPath = path.join(__dirname, '..', 'node_modules', '@distube', 'spotify', 'dist', 'index.js');
if (fs.existsSync(spotifyPath)) {
  let code = fs.readFileSync(spotifyPath, 'utf8');
  if (!code.includes('SPOTIFY_API_FALLBACK')) {
    // Read the helper function from a separate file (avoids template literal escaping issues)
    const helperFn = fs.readFileSync(path.join(__dirname, 'spotify-helper.js'), 'utf8');

    // Insert helper function before the class
    code = code.replace(
      /var SpotifyPlugin = class/,
      helperFn + '\nvar SpotifyPlugin = class'
    );

    // Replace the playlist/album branch in getData to use spclient FIRST (gets latest songs)
    // Then fall back to standard API, then scraping
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
      `    // SPOTIFY_API_FALLBACK: Use spclient as PRIMARY path for playlists/albums
    // This fetches the most recently added tracks via Spotify's internal API
    if (type === "playlist" || type === "album") {
      try {
        const anonData = await fetchAllTracksAnon(id, type);
        if (anonData) {
          const tracks = anonData.items
            .map((item) => {
              const t = type === "playlist" ? item.track : item;
              if (!t || t.type !== "track") return null;
              return new APITrack(t);
            })
            .filter(Boolean);
          console.log("[SPOTIFY] Loaded " + tracks.length + " tracks via spclient (newest first)");
          return {
            type,
            name: anonData.name,
            thumbnail: anonData.thumbnail,
            url: anonData.url,
            tracks
          };
        }
      } catch (e3) {
        console.warn("[SPOTIFY] spclient failed, trying standard API:", e3.message);
      }
    }
    try {
      const { body } = await WEB_API[type === "album" ? "getAlbum" : type === "playlist" ? "getPlaylist" : "getArtist"](id);
      let allTracks = (await this.#getTracks(body)).filter((t) => t?.type === "track").map((t) => new APITrack(t));
      if (type === "playlist") {
        allTracks = allTracks.reverse().slice(0, 100);
        console.log("[SPOTIFY] Loaded " + allTracks.length + " tracks (newest first) via standard API");
      }
      return {
        type,
        name: body.name,
        thumbnail: body.images?.[0]?.url,
        url: body.external_urls?.spotify,
        tracks: allTracks
      };
    } catch (e) {
      // Last resort: scraping
      console.log("[SPOTIFY_SCRAPE] All APIs failed, using scraping last resort");
      if (type === "playlist" || type === "album") {
        try {
          const data = await INFO.getData(url);
          const thumbnail = data.coverArt?.sources?.[0]?.url;
          let tracks = data.trackList.map((i) => ({
            type: "track",
            id: this.parseUrl(i.uri).id,
            name: i.title,
            artists: [{ name: i.subtitle }],
            duration: i.duration,
            thumbnail
          }));
          if (type === "playlist") {
            tracks = tracks.reverse();
            console.log("[SPOTIFY_SCRAPE] Reversed " + tracks.length + " tracks (newest first)");
          }
          return {
            type,
            name: data.title,
            thumbnail,
            url,
            tracks
          };
        } catch (e2) {
          throw apiError(e);
        }
      }
      throw apiError(e);
    }`
    );

    // Fix refreshToken's fallback scraping (open.spotify.com no longer embeds tokens)
    code = code.replace(
      'await (0, import_undici.fetch)("https://open.spotify.com/")',
      'await (0, import_undici.fetch)("https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC")'
    );

    // Reverse tracks in the early scraping path (when _tokenAvailable is false)
    code = code.replace(
      `    if (!this._tokenAvailable) {
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
    }`,
      `    if (!this._tokenAvailable) {
      console.log("[SPOTIFY_SCRAPE] tokenAvailable=false, using scraping fallback");
      const data = await INFO.getData(url);
      const thumbnail = data.coverArt?.sources?.[0]?.url;
      let tracks = data.trackList.map((i) => ({
        type: "track",
        id: this.parseUrl(i.uri).id,
        name: i.title,
        artists: [{ name: i.subtitle }],
        duration: i.duration,
        thumbnail
      }));
      if (type === "playlist") {
        tracks = tracks.reverse();
        console.log("[SPOTIFY_SCRAPE] Reversed " + tracks.length + " tracks (newest first)");
      }
      return {
        type,
        name: data.title,
        thumbnail,
        url,
        tracks
      };
    }`
    );

    fs.writeFileSync(spotifyPath, code);
    console.log('[postinstall] Patched @distube/spotify: spclient API for newest playlist tracks');
  }
}
