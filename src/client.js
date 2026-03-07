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

const plugins = [new SoundCloudPlugin()];

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

// YtDlpPlugin must be last — it's a catch-all for YouTube and 700+ other sites
plugins.push(new YtDlpPlugin({ update: false }));

client.distube = new DisTube(client, {
  plugins,
  ffmpeg: { path: ffmpegPath },
});

module.exports = client;
