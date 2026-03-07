const { SlashCommandBuilder } = require('discord.js');
const { formatDuration } = require('../utils/formatDuration');

function parseTime(input) {
  // Accept "90", "1:30", "01:30", "1:01:30"
  const parts = input.split(':').map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('seek')
    .setDescription('Seek to a position in the current song')
    .addStringOption((opt) =>
      opt
        .setName('time')
        .setDescription('Position to seek to (e.g. 90, 1:30, 01:30)')
        .setRequired(true)
    ),

  async execute(interaction) {
    const queue = interaction.client.distube.getQueue(interaction.guildId);
    if (!queue) {
      return interaction.reply({ content: 'Nothing is playing right now.', ephemeral: true });
    }

    const input = interaction.options.getString('time');
    const seconds = parseTime(input);

    if (seconds === null || seconds < 0) {
      return interaction.reply({ content: 'Invalid time format. Use seconds (90) or mm:ss (1:30).', ephemeral: true });
    }

    const song = queue.songs[0];
    if (seconds >= song.duration) {
      return interaction.reply({
        content: `Cannot seek past the song duration (${song.formattedDuration}).`,
        ephemeral: true,
      });
    }

    await interaction.client.distube.seek(interaction.guildId, seconds);
    await interaction.reply({ content: `Seeked to **${formatDuration(seconds)}**` });
  },
};
