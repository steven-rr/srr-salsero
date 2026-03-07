const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../utils/embed');
const { formatDuration } = require('../utils/formatDuration');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Show the current music queue'),

  async execute(interaction) {
    const queue = interaction.client.distube.getQueue(interaction.guildId);
    if (!queue) {
      return interaction.reply({ content: 'Nothing is playing right now.', ephemeral: true });
    }

    const current = queue.songs[0];
    const upcoming = queue.songs.slice(1, 11);

    let description = `**Now Playing:**\n[${current.name}](${current.url}) \`${current.formattedDuration}\` - ${current.user}\n`;

    if (upcoming.length > 0) {
      description += '\n**Up Next:**\n';
      description += upcoming
        .map((song, i) => `\`${i + 1}.\` [${song.name}](${song.url}) \`${song.formattedDuration}\` - ${song.user}`)
        .join('\n');
    }

    if (queue.songs.length > 11) {
      description += `\n\n...and **${queue.songs.length - 11}** more`;
    }

    const totalDuration = queue.songs.reduce((acc, song) => acc + song.duration, 0);

    const embed = createEmbed({
      title: 'Music Queue',
      description,
      footer: `${queue.songs.length} songs | Total: ${formatDuration(totalDuration)}`,
    });

    await interaction.reply({ embeds: [embed] });
  },
};
