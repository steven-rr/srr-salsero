const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../utils/embed');
const { formatDuration } = require('../utils/formatDuration');
const { progressBar } = require('../utils/progressBar');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Show the currently playing song'),

  async execute(interaction) {
    const queue = interaction.client.distube.getQueue(interaction.guildId);
    if (!queue) {
      return interaction.reply({ content: 'Nothing is playing right now.', ephemeral: true });
    }

    const song = queue.songs[0];
    const currentTime = queue.currentTime;
    const bar = progressBar(currentTime, song.duration);
    const elapsed = formatDuration(currentTime);
    const total = song.formattedDuration;

    const repeatModes = ['Off', 'Song', 'Queue'];

    const embed = createEmbed({
      title: 'Now Playing',
      description: `[${song.name}](${song.url})`,
      thumbnail: song.thumbnail,
      fields: [
        { name: 'Duration', value: `${bar}\n${elapsed} / ${total}`, inline: false },
        { name: 'Requested by', value: `${song.user}`, inline: true },
        { name: 'Volume', value: `${queue.volume}%`, inline: true },
        { name: 'Loop', value: repeatModes[queue.repeatMode], inline: true },
      ],
    });

    await interaction.reply({ embeds: [embed] });
  },
};
