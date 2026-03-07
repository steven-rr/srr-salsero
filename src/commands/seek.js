const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('seek')
    .setDescription('Seek to a position in the current song')
    .addIntegerOption((opt) =>
      opt
        .setName('seconds')
        .setDescription('Position in seconds to seek to')
        .setRequired(true)
        .setMinValue(0)
    ),

  async execute(interaction) {
    const queue = interaction.client.distube.getQueue(interaction.guildId);
    if (!queue) {
      return interaction.reply({ content: 'Nothing is playing right now.', ephemeral: true });
    }

    const seconds = interaction.options.getInteger('seconds');
    const song = queue.songs[0];

    if (seconds >= song.duration) {
      return interaction.reply({
        content: `Cannot seek past the song duration (${song.formattedDuration}).`,
        ephemeral: true,
      });
    }

    await interaction.client.distube.seek(interaction.guildId, seconds);
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    await interaction.reply({ content: `Seeked to **${min}:${String(sec).padStart(2, '0')}**` });
  },
};
