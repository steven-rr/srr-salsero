
// SPOTIFY_API_FALLBACK helper: fetch newest tracks via Spotify internal APIs
// Uses spclient (not rate limited) to get all track URIs with timestamps,
// then fetches metadata for the newest 100 via spclient metadata endpoint
function base62ToHex(id) {
  const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let n = BigInt(0);
  for (let i = 0; i < id.length; i++) {
    n = n * BigInt(62) + BigInt(chars.indexOf(id[i]));
  }
  return n.toString(16).padStart(32, "0");
}

async function fetchAllTracksAnon(playlistId, type) {
  const { fetch: undiciFetch } = require("undici");
  console.log("[SPOTIFY_ANON] Starting for " + type + " id=" + playlistId);

  // Step 1: Get anonymous token from embed page
  const embedUrl = "https://open.spotify.com/embed/" + type + "/" + playlistId;
  const pageRes = await undiciFetch(embedUrl);
  const pageText = await pageRes.text();
  const tokenMatch = pageText.match(/"accessToken":"(.+?)"/);
  if (!tokenMatch) {
    console.warn("[SPOTIFY_ANON] Could not scrape token from embed page");
    return null;
  }
  const anonToken = tokenMatch[1];
  const headers = { Authorization: "Bearer " + anonToken };

  // Step 2: Get ALL track URIs + timestamps via spclient (not rate limited!)
  const spRes = await undiciFetch(
    "https://spclient.wg.spotify.com/playlist/v2/playlist/" + playlistId,
    { headers: { ...headers, Accept: "application/json" } }
  );
  if (!spRes.ok) {
    console.warn("[SPOTIFY_ANON] spclient playlist fetch failed:", spRes.status);
    return null;
  }
  const spData = await spRes.json();
  const allUris = spData.contents.items;
  const playlistName = spData.attributes?.name || "Playlist";
  console.log("[SPOTIFY_ANON] spclient returned " + allUris.length + " tracks for: " + playlistName);

  // Step 3: Take last 100 (newest added based on position - Spotify adds to end)
  const newest = allUris.slice(-100);

  // Step 4: Fetch track metadata via spclient metadata endpoint (not rate limited!)
  // Process in parallel batches of 10
  const tracks = [];
  const batchSize = 10;
  for (let i = 0; i < newest.length; i += batchSize) {
    const batch = newest.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(async (item) => {
      const trackId = item.uri.split(":")[2];
      const hexId = base62ToHex(trackId);
      try {
        const metaRes = await undiciFetch(
          "https://spclient.wg.spotify.com/metadata/4/track/" + hexId,
          { headers: { ...headers, Accept: "application/json" } }
        );
        if (!metaRes.ok) return null;
        const meta = await metaRes.json();
        return {
          type: "track",
          id: trackId,
          name: meta.name,
          artists: (meta.artist || []).map(a => ({ name: a.name })),
          duration_ms: meta.duration,
          album: {
            images: meta.album?.cover_group?.image?.length
              ? [{ url: "https://i.scdn.co/image/" + meta.album.cover_group.image[meta.album.cover_group.image.length - 1].file_id }]
              : []
          }
        };
      } catch (e) {
        return null;
      }
    }));
    tracks.push(...results.filter(Boolean));
  }

  // Reverse so newest added song is first in queue
  tracks.reverse();
  console.log("[SPOTIFY_ANON] Loaded " + tracks.length + " tracks (newest first) from: " + playlistName);

  // Get playlist thumbnail from embed page data
  let thumbnail;
  try {
    const dataMatch = pageText.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
    if (dataMatch) {
      const nd = JSON.parse(dataMatch[1]);
      thumbnail = nd.props?.pageProps?.state?.data?.entity?.coverArt?.sources?.[0]?.url;
    }
  } catch (e) {}

  return {
    name: playlistName,
    thumbnail,
    url: "https://open.spotify.com/playlist/" + playlistId,
    items: tracks.map(t => ({ track: t })),
    type
  };
}
