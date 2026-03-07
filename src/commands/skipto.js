const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skipto')
    .setDescription('Skip to a specific song in the queue')
    .addIntegerOption((opt) =>
      opt
        .setName('position')
        .setDescription('Position in the queue to skip to (1 = next song)')
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction) {
    const distube = interaction.client.distube;
    const queue = distube.getQueue(interaction.guildId);
    if (!queue) {
      return interaction.reply({ content: 'Nothing is playing right now.', ephemeral: true });
    }

    const position = interaction.options.getInteger('position');
    if (position >= queue.songs.length) {
      return interaction.reply({
        content: `Invalid position. The queue only has ${queue.songs.length - 1} upcoming songs.`,
        ephemeral: true,
      });
    }

    const target = queue.songs[position];
    await distube.jump(interaction.guildId, position);
    await interaction.reply({ content: `Skipped to **${target.name}**.` });
  },
};
