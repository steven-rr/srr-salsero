const ffmpegPath = require('ffmpeg-static');
process.env.FFMPEG_PATH = ffmpegPath;
process.env.YTDLP_DIR = require('path').join(__dirname, '..', 'bin');
process.env.YTDLP_DISABLE_DOWNLOAD = '1';

const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { DisTube } = require('distube');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const { SpotifyPlugin } = require('@distube/spotify');
const { SoundCloudPlugin } = require('@distube/soundcloud');
const config = require('./config');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.commands = new Collection();

const plugins = [];

if (config.spotify.clientId && config.spotify.clientSecret) {
  plugins.push(
    new SpotifyPlugin({
      api: {
        clientId: config.spotify.clientId,
        clientSecret: config.spotify.clientSecret,
      },
    })
  );
}

// YtDlpPlugin handles YouTube search + 700+ sites — must come before SoundCloud
// so Spotify track resolution searches YouTube first (more reliable, no rate limits)
plugins.push(new YtDlpPlugin({ update: false }));

// SoundCloudPlugin last — only used for direct SoundCloud URLs, not as search fallback
plugins.push(new SoundCloudPlugin());

client.distube = new DisTube(client, {
  plugins,
  ffmpeg: { path: ffmpegPath },
});

// Log voice connection and audio player state changes for debugging "no audio" issues
client.distube.on('initQueue', (queue) => {
  const voice = queue.voice;
  if (voice?.connection) {
    voice.connection.on('stateChange', (oldState, newState) => {
      console.log(`[VOICE] Connection: ${oldState.status} → ${newState.status}`);
    });
  }
  if (voice?.audioPlayer) {
    voice.audioPlayer.on('stateChange', (oldState, newState) => {
      console.log(`[AUDIO] Player: ${oldState.status} → ${newState.status}`);
    });
  }
});

// Patch: Prevent stale finish events after error skips.
// When ffmpeg crashes, DisTube's error handler shifts the song and starts the next one.
// But the old AudioPlayer also fires "finish", which incorrectly skips the next song.
// Fix: set a flag on error, clear it on playSong. Stale finish events always arrive
// BEFORE the next playSong event, so any finish while the flag is set is stale.
const { createEmbed, COLORS } = require('./utils/embed');
const origHandleSongFinish = client.distube.queues.handleSongFinish.bind(client.distube.queues);
client.distube.queues.handleSongFinish = async function(queue) {
  if (queue._errorDebounce) {
    console.log('[DEBOUNCE] Ignoring stale finish event for:', queue.songs[0]?.name);
    return;
  }
  // Detect songs that "finished" almost instantly (bad/empty stream from YouTube)
  const song = queue.songs[0];
  const elapsed = queue._songStartedAt ? (Date.now() - queue._songStartedAt) / 1000 : null;
  if (song && elapsed !== null && elapsed < 10 && song.duration > 30 && !queue._manualSkip) {
    console.log(`[EARLY_FINISH] "${song.name}" finished in ${elapsed.toFixed(1)}s (expected ${song.duration}s)`);
    const embed = createEmbed({
      title: 'Playback Error',
      description: `Could not stream **${song.name}** — skipped.`,
      color: COLORS.error,
    });
    queue.textChannel?.send({ embeds: [embed] });
  }
  return origHandleSongFinish(queue);
};

client.distube.setMaxListeners(client.distube.getMaxListeners() + 2);
client.distube.on('error', (_error, queue) => {
  queue._errorDebounce = true;
});
client.distube.on('playSong', (queue) => {
  queue._errorDebounce = false;
  queue._manualSkip = false;
});

module.exports = client;
