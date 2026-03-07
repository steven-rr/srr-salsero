const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { DisTube } = require('distube');
const { YouTubePlugin } = require('@distube/youtube');
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

const plugins = [new YouTubePlugin(), new SoundCloudPlugin()];

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

client.distube = new DisTube(client, { plugins });

module.exports = client;
